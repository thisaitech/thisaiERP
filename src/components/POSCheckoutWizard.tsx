import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  UserPlus,
  CreditCard,
  Money,
  QrCode,
  Bank,
  Clock,
  Receipt,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  Printer,
  Share,
  Percent,
  Tag,
  CaretDown,
  Sparkle,
  CheckCircle,
  CurrencyInr,
  ShoppingCart,
  WhatsappLogo
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { getParties, createParty } from '../services/partyService'
import type { Party } from '../types'
import { useLanguage } from '../contexts/LanguageContext'

// Cart Item type
interface CartItem {
  id: string
  itemId?: string  // Inventory item ID for stock update
  name: string
  price: number
  quantity: number
  unit: string
  tax: number
  taxAmount: number
  hsnCode?: string
  discount?: number
}

// Payment method type
type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank' | 'credit' | 'mixed'

interface POSCheckoutWizardProps {
  items: CartItem[]
  onComplete: (data: CheckoutData) => void
  onCancel: () => void
  companySettings?: any
}

export interface CheckoutData {
  customer: {
    id?: string
    name: string
    phone?: string
    isWalkIn: boolean
  }
  payment: {
    method: PaymentMethod
    amount: number
    receivedAmount?: number
    changeAmount?: number
    transactionId?: string
    bankAccount?: string
    splitPayments?: Array<{
      method: PaymentMethod
      amount: number
      transactionId?: string
    }>
  }
  discount: {
    type: 'percentage' | 'amount'
    value: number
    discountAmount: number
  }
  roundOff: number
  grandTotal: number
  items: CartItem[]
}

const POSCheckoutWizard: React.FC<POSCheckoutWizardProps> = ({
  items,
  onComplete,
  onCancel,
  companySettings
}) => {
  // Translation support
  const { t } = useLanguage()

  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  // Step 1: Customer Selection
  const [parties, setParties] = useState<Party[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Party | null>(null)
  const [isWalkIn, setIsWalkIn] = useState(true)
  const [walkInName, setWalkInName] = useState('Walk-in Customer')
  const [walkInPhone, setWalkInPhone] = useState('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [loadingParties, setLoadingParties] = useState(true)

  // Step 2: Payment Method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [receivedAmount, setReceivedAmount] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [selectedBank, setSelectedBank] = useState('')

  // Step 3: Discount & Summary
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [roundOffEnabled, setRoundOffEnabled] = useState(true)

  // Step 4: Success
  const [invoiceNumber, setInvoiceNumber] = useState('')

  // Load parties on mount
  useEffect(() => {
    const loadParties = async () => {
      try {
        const data = await getParties('customer')
        setParties(data)
      } catch (error) {
        console.error('Error loading parties:', error)
      } finally {
        setLoadingParties(false)
      }
    }
    loadParties()
  }, [])

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0)
    const totalBeforeDiscount = subtotal + taxAmount

    // Calculate discount
    let discountAmount = 0
    if (discountValue && parseFloat(discountValue) > 0) {
      if (discountType === 'percentage') {
        discountAmount = (totalBeforeDiscount * parseFloat(discountValue)) / 100
      } else {
        discountAmount = parseFloat(discountValue)
      }
    }

    const afterDiscount = totalBeforeDiscount - discountAmount

    // Round off
    let roundOff = 0
    let grandTotal = afterDiscount
    if (roundOffEnabled) {
      grandTotal = Math.round(afterDiscount)
      roundOff = grandTotal - afterDiscount
    }

    // Change calculation for cash
    const received = parseFloat(receivedAmount) || 0
    const change = received > grandTotal ? received - grandTotal : 0

    return {
      subtotal,
      taxAmount,
      totalBeforeDiscount,
      discountAmount,
      afterDiscount,
      roundOff,
      grandTotal,
      received,
      change
    }
  }, [items, discountType, discountValue, roundOffEnabled, receivedAmount])

  // Print receipt - Full page print
  const handlePrint = () => {
    const settings = companySettings || {}
    const customerNameDisplay = isWalkIn ? walkInName : (selectedCustomer?.displayName || selectedCustomer?.companyName || 'Walk-in Customer')
    const customerPhone = isWalkIn ? walkInPhone : (selectedCustomer?.phone || '')
    const billNumber = `POS-${Date.now().toString().slice(-6)}`
    const currentDate = new Date()

    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${billNumber}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: #fff;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 5px;
          }
          .company-details {
            font-size: 13px;
            color: #666;
            line-height: 1.6;
          }
          .gstin {
            font-weight: bold;
            color: #333;
            margin-top: 5px;
          }
          .invoice-title {
            text-align: center;
            font-size: 22px;
            font-weight: bold;
            color: #6366f1;
            margin: 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .info-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
          }
          .info-block h4 {
            font-size: 12px;
            color: #6366f1;
            text-transform: uppercase;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .info-block p {
            font-size: 14px;
            margin: 3px 0;
          }
          .info-block .value {
            font-weight: 600;
            color: #111;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th {
            background: #6366f1;
            color: white;
            padding: 12px 10px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
          }
          th:last-child, td:last-child { text-align: right; }
          td {
            padding: 12px 10px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }
          tr:nth-child(even) { background: #f9fafb; }
          .totals {
            margin-top: 20px;
            margin-left: auto;
            width: 300px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .totals-row.grand-total {
            font-size: 18px;
            font-weight: bold;
            color: #6366f1;
            border-bottom: none;
            border-top: 2px solid #6366f1;
            padding-top: 12px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .footer .thanks {
            font-size: 16px;
            font-weight: bold;
            color: #6366f1;
            margin-bottom: 10px;
          }
          .footer .powered {
            font-size: 11px;
            color: #999;
            margin-top: 15px;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div class="company-name">${settings.companyName || 'Your Business'}</div>
            <div class="company-details">
              ${settings.address ? settings.address + '<br>' : ''}
              ${settings.city || ''}${settings.state ? ', ' + settings.state : ''} ${settings.pincode || ''}
              ${settings.phone ? '<br>Phone: ' + settings.phone : ''}
              ${settings.email ? ' | Email: ' + settings.email : ''}
            </div>
            ${settings.gstin ? '<div class="gstin">GSTIN: ' + settings.gstin + '</div>' : ''}
          </div>

          <div class="invoice-title">Tax Invoice</div>

          <div class="info-section">
            <div class="info-block">
              <h4>Bill To</h4>
              <p class="value">${customerNameDisplay}</p>
              ${customerPhone ? '<p>Phone: ' + customerPhone + '</p>' : ''}
            </div>
            <div class="info-block" style="text-align: right;">
              <h4>Invoice Details</h4>
              <p>Invoice No: <span class="value">${billNumber}</span></p>
              <p>Date: <span class="value">${currentDate.toLocaleDateString('en-IN')}</span></p>
              <p>Time: <span class="value">${currentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Item</th>
                <th style="width: 80px;">Qty</th>
                <th style="width: 100px;">Rate</th>
                <th style="width: 80px;">Tax</th>
                <th style="width: 110px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item.name}${item.hsnCode ? '<br><small style="color:#666;">HSN: ' + item.hsnCode + '</small>' : ''}</td>
                  <td>${item.quantity} ${item.unit || ''}</td>
                  <td>₹${item.price.toLocaleString('en-IN')}</td>
                  <td>${item.tax}%</td>
                  <td>₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>₹${calculations.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div class="totals-row">
              <span>Tax:</span>
              <span>₹${calculations.taxAmount.toLocaleString('en-IN')}</span>
            </div>
            ${calculations.discountAmount > 0 ? `
              <div class="totals-row" style="color: #16a34a;">
                <span>Discount:</span>
                <span>-₹${calculations.discountAmount.toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            ${calculations.roundOff !== 0 ? `
              <div class="totals-row">
                <span>Round Off:</span>
                <span>${calculations.roundOff >= 0 ? '+' : ''}₹${calculations.roundOff.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="totals-row grand-total">
              <span>Grand Total:</span>
              <span>₹${calculations.grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div class="footer">
            <div class="thanks">Thank You for Your Business!</div>
            <p>Payment Method: ${paymentMethod.toUpperCase()}</p>
            ${paymentMethod === 'cash' && calculations.change > 0 ? '<p>Change Given: ₹' + calculations.change.toLocaleString('en-IN') + '</p>' : ''}
            <div class="powered">Powered by Anna ERP</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(printHTML)
      printWindow.document.close()
    }
  }

  // Share via WhatsApp
  const handleShare = () => {
    const customerNameDisplay = isWalkIn ? walkInName : (selectedCustomer?.displayName || selectedCustomer?.companyName || 'Customer')
    const customerPhone = isWalkIn ? walkInPhone : (selectedCustomer?.phone || '')
    const billNumber = `POS-${Date.now().toString().slice(-6)}`
    const settings = companySettings || {}

    const itemsList = items.map(item =>
      `• ${item.name} x${item.quantity} = ₹${(item.price * item.quantity).toLocaleString('en-IN')}`
    ).join('\n')

    const message = `*${settings.companyName || 'Invoice'}*\n\n` +
      `Invoice: ${billNumber}\n` +
      `Date: ${new Date().toLocaleDateString('en-IN')}\n` +
      `Customer: ${customerNameDisplay}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `Subtotal: ₹${calculations.subtotal.toLocaleString('en-IN')}\n` +
      `Tax: ₹${calculations.taxAmount.toLocaleString('en-IN')}\n` +
      (calculations.discountAmount > 0 ? `Discount: -₹${calculations.discountAmount.toLocaleString('en-IN')}\n` : '') +
      `*Total: ₹${calculations.grandTotal.toLocaleString('en-IN')}*\n\n` +
      `Thank you for your business! 🙏`

    const encodedMessage = encodeURIComponent(message)
    const phone = customerPhone?.replace(/\D/g, '') || ''

    const whatsappUrl = phone
      ? `https://wa.me/91${phone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`

    window.open(whatsappUrl, '_blank')
  }

  // Filter parties based on search
  const filteredParties = useMemo(() => {
    if (!customerSearch.trim()) return parties.slice(0, 10)
    const search = customerSearch.toLowerCase()
    return parties.filter(p =>
      p.companyName?.toLowerCase().includes(search) ||
      p.displayName?.toLowerCase().includes(search) ||
      p.phone?.includes(search)
    ).slice(0, 10)
  }, [parties, customerSearch])

  // Handle customer selection
  const handleSelectCustomer = (party: Party) => {
    setSelectedCustomer(party)
    setIsWalkIn(false)
    setCustomerSearch(party.displayName || party.companyName)
  }

  // Handle adding new customer
  const handleAddNewCustomer = async () => {
    if (!newCustomerName.trim()) return

    try {
      const newParty = await createParty({
        type: 'customer',
        companyName: newCustomerName.trim(),
        displayName: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        email: '',
        contacts: [],
        billingAddress: {
          line1: '', line2: '', city: '', state: '', pincode: '', country: 'India'
        },
        sameAsShipping: true
      })

      if (newParty) {
        setParties(prev => [newParty, ...prev])
        handleSelectCustomer(newParty)
        setShowAddCustomer(false)
        setNewCustomerName('')
        setNewCustomerPhone('')
      }
    } catch (error) {
      console.error('Error creating customer:', error)
    }
  }

  // Handle checkout completion
  const handleComplete = () => {
    const checkoutData: CheckoutData = {
      customer: {
        id: selectedCustomer?.id,
        name: isWalkIn ? walkInName : (selectedCustomer?.displayName || selectedCustomer?.companyName || ''),
        phone: isWalkIn ? walkInPhone : selectedCustomer?.phone,
        isWalkIn
      },
      payment: {
        method: paymentMethod,
        amount: calculations.grandTotal,
        receivedAmount: calculations.received || calculations.grandTotal,
        changeAmount: calculations.change,
        transactionId: transactionId || undefined,
        bankAccount: selectedBank || undefined
      },
      discount: {
        type: discountType,
        value: parseFloat(discountValue) || 0,
        discountAmount: calculations.discountAmount
      },
      roundOff: calculations.roundOff,
      grandTotal: calculations.grandTotal,
      items
    }

    onComplete(checkoutData)
  }

  // Quick cash amounts
  const quickAmounts = [100, 200, 500, 1000, 2000]

  // Payment methods with icons
  const paymentMethods = [
    { id: 'cash' as PaymentMethod, label: 'Cash', icon: Money, color: 'bg-green-500' },
    { id: 'upi' as PaymentMethod, label: 'UPI', icon: QrCode, color: 'bg-purple-500' },
    { id: 'card' as PaymentMethod, label: 'Card', icon: CreditCard, color: 'bg-blue-500' },
    { id: 'bank' as PaymentMethod, label: 'Bank', icon: Bank, color: 'bg-orange-500' },
    { id: 'credit' as PaymentMethod, label: 'Credit', icon: Clock, color: 'bg-red-500' }
  ]

  // Step indicator component
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
              currentStep === step
                ? "bg-purple-600 text-white scale-110"
                : currentStep > step
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-500"
            )}
          >
            {currentStep > step ? <Check size={16} weight="bold" /> : step}
          </div>
          {step < 4 && (
            <div
              className={cn(
                "w-8 h-1 rounded-full transition-all",
                currentStep > step ? "bg-green-500" : "bg-gray-200"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  // Render step 1: Customer Selection
  const renderCustomerStep = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <User size={24} className="text-purple-600" />
        Select Customer
      </h2>

      {/* Walk-in / Quick Options */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setIsWalkIn(true); setSelectedCustomer(null); }}
          className={cn(
            "p-4 rounded-xl border-2 text-left transition-all",
            isWalkIn
              ? "border-purple-500 bg-purple-50"
              : "border-gray-200 hover:border-purple-300"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isWalkIn ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-500"
            )}>
              <User size={20} weight="bold" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">Walk-in</p>
              <p className="text-xs text-gray-500">Cash Customer</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowAddCustomer(true)}
          className="p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-300 hover:bg-purple-50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
              <UserPlus size={20} weight="bold" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">+ New</p>
              <p className="text-xs text-gray-500">Add Customer</p>
            </div>
          </div>
        </button>
      </div>

      {/* Walk-in Details */}
      {isWalkIn && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <input
            type="text"
            value={walkInName}
            onChange={(e) => setWalkInName(e.target.value)}
            placeholder="Customer Name (optional)"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
          />
          <input
            type="tel"
            value={walkInPhone}
            onChange={(e) => setWalkInPhone(e.target.value)}
            placeholder="Phone Number (optional)"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
          />
        </div>
      )}

      {/* Customer Search */}
      {!isWalkIn && (
        <>
          <div className="relative">
            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customer by name or phone..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
            />
          </div>

          {/* Customer List */}
          <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 divide-y">
            {filteredParties.map((party) => (
              <button
                key={party.id}
                onClick={() => handleSelectCustomer(party)}
                className={cn(
                  "w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors",
                  selectedCustomer?.id === party.id && "bg-purple-50"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <User size={18} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {party.displayName || party.companyName}
                  </p>
                  <p className="text-xs text-gray-500">{party.phone || 'No phone'}</p>
                </div>
                {selectedCustomer?.id === party.id && (
                  <Check size={20} className="text-purple-600" weight="bold" />
                )}
              </button>
            ))}
            {filteredParties.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500">
                No customers found
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Customer Modal */}
      <AnimatePresence>
        {showAddCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddCustomer(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
            >
              <div className="bg-purple-600 px-4 py-3 flex items-center justify-between">
                <h3 className="font-bold text-white">Add New Customer</h3>
                <button onClick={() => setShowAddCustomer(false)}>
                  <X size={20} className="text-white" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Customer Name *"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  autoFocus
                />
                <input
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowAddCustomer(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNewCustomer}
                    disabled={!newCustomerName.trim()}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-purple-600 text-white font-medium disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  // Render step 2: Payment Method
  const renderPaymentStep = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <CreditCard size={24} className="text-purple-600" />
        Payment Method
      </h2>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-3 gap-3">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => setPaymentMethod(method.id)}
            className={cn(
              "p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
              paymentMethod === method.id
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 hover:border-purple-300"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-white",
              method.color
            )}>
              <method.icon size={24} weight="bold" />
            </div>
            <span className="font-medium text-gray-800 text-sm">{method.label}</span>
          </button>
        ))}
      </div>

      {/* Amount to Pay */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white">
        <p className="text-sm opacity-80">Amount to Pay</p>
        <p className="text-3xl font-bold">₹{calculations.grandTotal.toLocaleString()}</p>
      </div>

      {/* Cash Payment - Received Amount */}
      {paymentMethod === 'cash' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Amount Received
          </label>
          <input
            type="number"
            value={receivedAmount}
            onChange={(e) => setReceivedAmount(e.target.value)}
            placeholder="Enter received amount"
            className="w-full px-4 py-3 text-lg rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500"
          />

          {/* Quick amounts */}
          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setReceivedAmount(String(calculations.grandTotal + amount))}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
              >
                +₹{amount}
              </button>
            ))}
            <button
              onClick={() => setReceivedAmount(String(calculations.grandTotal))}
              className="px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-sm font-medium text-purple-700 transition-colors"
            >
              Exact
            </button>
          </div>

          {/* Change to return */}
          {calculations.change > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-700">Change to Return</p>
              <p className="text-2xl font-bold text-green-600">₹{calculations.change.toLocaleString()}</p>
            </div>
          )}
        </div>
      )}

      {/* UPI Payment */}
      {paymentMethod === 'upi' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            UPI Transaction ID (optional)
          </label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Enter UPI transaction ID"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>
      )}

      {/* Card Payment */}
      {paymentMethod === 'card' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Card Transaction ID (optional)
          </label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Enter card transaction ID"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>
      )}

      {/* Credit - Due Date info */}
      {paymentMethod === 'credit' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Clock size={24} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Credit Sale</p>
              <p className="text-sm text-amber-600">
                This sale will be added to customer's pending balance
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Render step 3: Bill Summary & Discount
  const renderSummaryStep = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
        <Receipt size={24} className="text-purple-600" />
        Bill Summary
      </h2>

      {/* Items List */}
      <div className="bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm truncate">{item.name}</p>
              <p className="text-xs text-gray-500">
                {item.quantity} × ₹{item.price}
              </p>
            </div>
            <p className="font-semibold text-gray-800">
              ₹{(item.price * item.quantity).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Discount Section */}
      <div className="bg-purple-50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-purple-800 flex items-center gap-2">
            <Tag size={18} />
            Add Discount
          </span>
          <div className="flex rounded-lg overflow-hidden border border-purple-200">
            <button
              onClick={() => setDiscountType('percentage')}
              className={cn(
                "px-3 py-1 text-sm font-medium transition-colors",
                discountType === 'percentage'
                  ? "bg-purple-600 text-white"
                  : "bg-white text-purple-600"
              )}
            >
              <Percent size={14} />
            </button>
            <button
              onClick={() => setDiscountType('amount')}
              className={cn(
                "px-3 py-1 text-sm font-medium transition-colors",
                discountType === 'amount'
                  ? "bg-purple-600 text-white"
                  : "bg-white text-purple-600"
              )}
            >
              ₹
            </button>
          </div>
        </div>
        <input
          type="number"
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
          placeholder={discountType === 'percentage' ? "Enter % discount" : "Enter discount amount"}
          className="w-full px-4 py-2.5 rounded-lg border border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        />
      </div>

      {/* Summary Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y">
        <div className="px-4 py-3 flex justify-between">
          <span className="text-gray-600">{t.common.subtotal}</span>
          <span className="font-medium">₹{calculations.subtotal.toLocaleString()}</span>
        </div>
        <div className="px-4 py-3 flex justify-between">
          <span className="text-gray-600">{t.common.tax}</span>
          <span className="font-medium">₹{calculations.taxAmount.toLocaleString()}</span>
        </div>
        {calculations.discountAmount > 0 && (
          <div className="px-4 py-3 flex justify-between text-green-600">
            <span>{t.common.discount}</span>
            <span className="font-medium">-₹{calculations.discountAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="px-4 py-3 flex justify-between items-center">
          <span className="text-gray-600 flex items-center gap-2">
            {t.sales.roundOff}
            <button
              onClick={() => setRoundOffEnabled(!roundOffEnabled)}
              className={cn(
                "w-10 h-5 rounded-full transition-colors relative",
                roundOffEnabled ? "bg-purple-500" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all",
                roundOffEnabled ? "right-0.5" : "left-0.5"
              )} />
            </button>
          </span>
          <span className="font-medium">
            {calculations.roundOff >= 0 ? '+' : ''}₹{calculations.roundOff.toFixed(2)}
          </span>
        </div>
        <div className="px-4 py-4 flex justify-between bg-purple-50">
          <span className="text-lg font-bold text-purple-800">{t.sales.grandTotal}</span>
          <span className="text-xl font-bold text-purple-600">
            ₹{calculations.grandTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Customer & Payment Info */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm">
        <div className="flex justify-between mb-2">
          <span className="text-gray-500">{t.sales.customer}</span>
          <span className="font-medium text-gray-800">
            {isWalkIn ? walkInName : (selectedCustomer?.displayName || selectedCustomer?.companyName)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{t.sales.payment}</span>
          <span className="font-medium text-gray-800 capitalize">{paymentMethod}</span>
        </div>
      </div>
    </div>
  )

  // Render step 4: Success
  const renderSuccessStep = () => (
    <div className="text-center py-6 space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center"
      >
        <CheckCircle size={64} className="text-green-500" weight="fill" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800">Payment Successful!</h2>
        <p className="text-gray-500 mt-1">Invoice has been created</p>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <p className="text-sm opacity-80">Amount Paid</p>
        <p className="text-4xl font-bold">₹{calculations.grandTotal.toLocaleString()}</p>
        {paymentMethod === 'cash' && calculations.change > 0 && (
          <p className="text-sm mt-2 opacity-80">
            Change: ₹{calculations.change.toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={handlePrint}
          className="px-6 py-3 rounded-xl border border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <Printer size={20} />
          Print
        </button>
        <button
          onClick={handleShare}
          className="px-6 py-3 rounded-xl border border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <WhatsappLogo size={20} className="text-green-500" />
          Share
        </button>
      </div>
    </div>
  )

  // Navigation buttons
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return isWalkIn || selectedCustomer !== null
      case 2:
        if (paymentMethod === 'cash') {
          const received = parseFloat(receivedAmount) || 0
          return received >= calculations.grandTotal
        }
        return true
      case 3:
        return true
      default:
        return true
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart size={24} className="text-white" weight="fill" />
            <div>
              <h1 className="font-bold text-white">Checkout</h1>
              <p className="text-xs text-white/70">{items.length} items</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X size={18} className="text-white" weight="bold" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-4 pt-4">
          <StepIndicator />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {currentStep === 1 && renderCustomerStep()}
              {currentStep === 2 && renderPaymentStep()}
              {currentStep === 3 && renderSummaryStep()}
              {currentStep === 4 && renderSuccessStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
          {currentStep < 4 ? (
            <div className="flex gap-3">
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-semibold text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft size={18} />
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (currentStep === 3) {
                    handleComplete()
                    setCurrentStep(4)
                  } else {
                    setCurrentStep(prev => prev + 1)
                  }
                }}
                disabled={!canProceed()}
                className={cn(
                  "flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
                  canProceed()
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                {currentStep === 3 ? (
                  <>
                    <CurrencyInr size={18} weight="bold" />
                    Receive Payment
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={onCancel}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
            >
              <ShoppingCart size={18} />
              New Sale
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default POSCheckoutWizard
