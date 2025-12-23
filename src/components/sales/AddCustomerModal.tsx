import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, Spinner } from '@phosphor-icons/react'
import { createParty, Party } from '../../services/partyService'
import { validateCustomerName, validatePhoneNumber, validateGSTIN } from '../../utils/inputValidation'

interface AddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onCustomerSaved: (newParty: Party) => void
}

// Indian States list - can be moved to a shared constants file later
const INDIAN_STATES = [
  'Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Arunachal Pradesh',
  'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
  'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry'
]

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onCustomerSaved }) => {
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [newCustomerGST, setNewCustomerGST] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [newCustomerState, setNewCustomerState] = useState('')
  const [newCustomerType, setNewCustomerType] = useState('Regular')
  const [newCustomerNotes, setNewCustomerNotes] = useState('')
  const [newCustomerOpeningBalance, setNewCustomerOpeningBalance] = useState('')
  const [newCustomerCreditDays, setNewCustomerCreditDays] = useState(30)

  const [showAddressField, setShowAddressField] = useState(false)
  const [showStateField, setShowStateField] = useState(false)
  const [showGstField, setShowGstField] = useState(false)
  const [showEmailField, setShowEmailField] = useState(false)
  const [showCustomerTypeField, setShowCustomerTypeField] = useState(false)
  const [showNotesField, setShowNotesField] = useState(false)
  const [showOpeningBalanceField, setShowOpeningBalanceField] = useState(false)
  const [showCreditDaysField, setShowCreditDaysField] = useState(false)

  const [savingCustomer, setSavingCustomer] = useState(false)

  const resetCustomerForm = () => {
    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewCustomerEmail('')
    setNewCustomerGST('')
    setNewCustomerAddress('')
    setNewCustomerState('')
    setNewCustomerType('Regular')
    setNewCustomerNotes('')
    setNewCustomerOpeningBalance('')
    setNewCustomerCreditDays(30)
    setShowAddressField(false)
    setShowStateField(false)
    setShowGstField(false)
    setShowEmailField(false)
    setShowCustomerTypeField(false)
    setShowNotesField(false)
    setShowOpeningBalanceField(false)
    setShowCreditDaysField(false)
  }

  const handleSaveNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error('Please enter customer name')
      return
    }

    setSavingCustomer(true)
    try {
      const openingBal = parseFloat(newCustomerOpeningBalance) || 0
      const newParty = await createParty({
        name: newCustomerName.trim(),
        type: 'customer',
        phone: newCustomerPhone.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
        gstin: newCustomerGST.trim() || undefined,
        billingAddress: newCustomerAddress.trim() || undefined,
        state: newCustomerState.trim() || undefined,
        openingBalance: openingBal,
        balance: openingBal,
        creditDays: newCustomerCreditDays,
      } as Omit<Party, 'id'>)

      if (newParty) {
        onCustomerSaved(newParty)
        resetCustomerForm()
        onClose()
        toast.success('Customer added successfully!')
      } else {
        toast.error('Failed to create customer')
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toast.error('Failed to create customer')
    } finally {
      setSavingCustomer(false)
    }
  }

  const handleClose = () => {
    resetCustomerForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-xl shadow-2xl p-4 sm:p-6"
      >
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Add New Customer</h2>

          {/* Mandatory Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Customer Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(validateCustomerName(e.target.value))}
                placeholder="Enter customer name"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Phone Number
              </label>
              <input
                type="tel"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(validatePhoneNumber(e.target.value))}
                placeholder="Enter phone number"
                maxLength={16}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Optional Fields */}
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Optional Information</p>

            {/* Fields... */}
            {/* Billing Address */}
            <div>
              {!showAddressField ? (
                <button onClick={() => setShowAddressField(true)} className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"><Plus size={14} weight="bold" /> Billing Address</button>
              ) : (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                  <label className="text-sm font-medium mb-1.5 block">Billing Address</label>
                  <textarea rows={2} value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} placeholder="Enter billing address" className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"></textarea>
                </motion.div>
              )}
            </div>
            {/* State */}
            <div>
                {!showStateField ? (
                    <button onClick={() => setShowStateField(true)} className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"><Plus size={14} weight="bold" /> State</button>
                ) : (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                        <label className="text-sm font-medium mb-1.5 block">State</label>
                        <select value={newCustomerState} onChange={(e) => setNewCustomerState(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all">
                            <option value="">Select State</option>
                            {INDIAN_STATES.map((state) => (<option key={state} value={state}>{state}</option>))}
                        </select>
                    </motion.div>
                )}
            </div>
            {/* GST Number */}
            <div>
                {!showGstField ? (
                    <button onClick={() => setShowGstField(true)} className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"><Plus size={14} weight="bold" /> GST Number</button>
                ) : (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                        <label className="text-sm font-medium mb-1.5 block">GST Number</label>
                        <input type="text" value={newCustomerGST} onChange={(e) => setNewCustomerGST(validateGSTIN(e.target.value))} placeholder="Enter GST number (15 chars)" maxLength={15} className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all uppercase" />
                    </motion.div>
                )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button onClick={handleClose} className="flex-1 px-4 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSaveNewCustomer}
              disabled={savingCustomer || !newCustomerName.trim()}
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingCustomer ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Customer'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AddCustomerModal
