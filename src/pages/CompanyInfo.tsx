import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Buildings,
  IdentificationCard,
  MapPin,
  Phone,
  Envelope,
  Globe,
  Bank,
  FileText,
  Receipt,
  ShieldCheck,
  CheckCircle,
  Warning,
  X,
  Camera,
  Upload,
  Pen,
  CaretDown,
  Info,
  Lightning,
  Sparkle,
  CurrencyInr,
  Truck,
  ChartLine,
  Export,
  Printer,
  CreditCard,
  CloudArrowUp,
  QrCode,
  Signature,
  Star,
  ArrowRight,
  Lock,
  Check,
  XCircle,
  Image
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  getCompanySettings,
  saveCompanySettings,
  CompanySettings,
  getTaxSettings,
  saveTaxSettings,
  getInvoicePrintSettings
} from '../services/settingsService'

// Indian States with codes for GST
const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
  { code: '99', name: 'Centre Jurisdiction' }
]

// Business Types
const BUSINESS_TYPES = [
  { value: 'proprietor', label: 'Proprietorship' },
  { value: 'partnership', label: 'Partnership Firm' },
  { value: 'llp', label: 'LLP (Limited Liability Partnership)' },
  { value: 'pvt_ltd', label: 'Private Limited Company' },
  { value: 'public_ltd', label: 'Public Limited Company' },
  { value: 'huf', label: 'HUF (Hindu Undivided Family)' },
  { value: 'trust', label: 'Trust' },
  { value: 'society', label: 'Society' },
  { value: 'other', label: 'Other' }
]

// Extended Company Settings Interface
interface ExtendedCompanySettings extends CompanySettings {
  tradeName?: string
  cin?: string
  businessType?: string
  signatureUrl?: string
  upiId?: string
  paymentQRCode?: string
  website?: string
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  branch?: string
  accountHolderName?: string
}

// Feature status interface
interface FeatureStatus {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  enabled: boolean
  requiredFields: string[]
  color: string
}

const CompanyInfo = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [stateSearch, setStateSearch] = useState('')
  const [profileCompletion, setProfileCompletion] = useState(0)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRef = useRef<HTMLInputElement>(null)
  const qrInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState<ExtendedCompanySettings>({
    companyName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    cin: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
    country: 'India',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    accountHolderName: '',
    invoicePrefix: 'INV',
    invoiceStartNumber: 1,
    quotationPrefix: 'QUO',
    showLogo: false,
    logoUrl: '',
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
    numberFormat: 'indian',
    businessType: 'proprietor',
    signatureUrl: '',
    upiId: '',
    paymentQRCode: ''
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load settings on mount
  useEffect(() => {
    const settings = getCompanySettings()
    setFormData(prev => ({ ...prev, ...settings }))
  }, [])

  // Calculate profile completion
  useEffect(() => {
    const requiredFields = ['companyName', 'gstin', 'pan', 'state', 'phone', 'email']
    const optionalFields = ['address', 'city', 'pincode', 'bankName', 'accountNumber', 'ifscCode', 'logoUrl', 'signatureUrl', 'upiId']

    let completed = 0
    const totalFields = requiredFields.length + optionalFields.length

    requiredFields.forEach(field => {
      if (formData[field as keyof ExtendedCompanySettings]) completed++
    })
    optionalFields.forEach(field => {
      if (formData[field as keyof ExtendedCompanySettings]) completed++
    })

    setProfileCompletion(Math.round((completed / totalFields) * 100))
  }, [formData])

  // Validate GSTIN format
  const validateGSTIN = (gstin: string): boolean => {
    if (!gstin) return true // Optional
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    return gstinRegex.test(gstin.toUpperCase())
  }

  // Validate PAN format
  const validatePAN = (pan: string): boolean => {
    if (!pan) return true // Optional
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    return panRegex.test(pan.toUpperCase())
  }

  // Extract state code from GSTIN
  const extractStateFromGSTIN = (gstin: string) => {
    if (gstin && gstin.length >= 2) {
      const stateCode = gstin.substring(0, 2)
      const state = INDIAN_STATES.find(s => s.code === stateCode)
      if (state) {
        setFormData(prev => ({
          ...prev,
          stateCode: state.code,
          state: state.name
        }))
      }
    }
  }

  // Handle input change
  const handleChange = (field: keyof ExtendedCompanySettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Auto-extract state from GSTIN
    if (field === 'gstin') {
      extractStateFromGSTIN(value)
    }
  }

  // Handle state selection
  const handleStateSelect = (state: { code: string; name: string }) => {
    setFormData(prev => ({
      ...prev,
      state: state.name,
      stateCode: state.code
    }))
    setShowStateDropdown(false)
    setStateSearch('')
  }

  // Handle file upload
  const handleFileUpload = (type: 'logo' | 'signature' | 'qr', file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size should be less than 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      if (type === 'logo') {
        setFormData(prev => ({ ...prev, logoUrl: base64, showLogo: true }))
      } else if (type === 'signature') {
        setFormData(prev => ({ ...prev, signatureUrl: base64 }))
      } else if (type === 'qr') {
        setFormData(prev => ({ ...prev, paymentQRCode: base64 }))
      }
    }
    reader.readAsDataURL(file)
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.companyName?.trim()) {
      newErrors.companyName = 'Company name is required'
    }

    if (formData.gstin && !validateGSTIN(formData.gstin)) {
      newErrors.gstin = 'Invalid GSTIN format'
    }

    if (formData.pan && !validatePAN(formData.pan)) {
      newErrors.pan = 'Invalid PAN format'
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Mobile number is required'
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Invalid mobile number'
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!formData.state) {
      newErrors.state = 'State is required for GST'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Save settings
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving')
      return
    }

    setIsSaving(true)
    try {
      await saveCompanySettings(formData)

      // Also update tax settings if GSTIN changed
      if (formData.gstin) {
        const taxSettings = getTaxSettings()
        saveTaxSettings({ ...taxSettings, gstin: formData.gstin })
      }

      toast.success('Company information saved successfully!')
      setIsEditing(false)

      // Show features unlocked message
      if (formData.companyName && formData.gstin && formData.pan && formData.state && formData.phone && formData.email) {
        toast.success('All GST features unlocked! You can now generate proper invoices & file returns easily.', {
          duration: 5000
        })
      }
    } catch (error) {
      toast.error('Failed to save company information')
    } finally {
      setIsSaving(false)
    }
  }

  // Get feature statuses
  const getFeatureStatuses = (): FeatureStatus[] => {
    const hasCompanyName = !!formData.companyName?.trim()
    const hasGSTIN = !!formData.gstin?.trim() && validateGSTIN(formData.gstin)
    const hasPAN = !!formData.pan?.trim()
    const hasState = !!formData.state
    const hasPhone = !!formData.phone?.trim()
    const hasEmail = !!formData.email?.trim()
    const hasAddress = !!formData.address?.trim()
    const hasBank = !!formData.bankName && !!formData.accountNumber && !!formData.ifscCode
    const hasLogo = !!formData.logoUrl
    const hasSignature = !!formData.signatureUrl

    return [
      {
        id: 'gst_invoice',
        name: 'GST Invoice Auto-Generate',
        description: 'Proper GST invoices with company name, GSTIN, logo, address, PAN in PDF',
        icon: <Receipt size={20} weight="duotone" />,
        enabled: hasCompanyName && hasGSTIN && hasAddress,
        requiredFields: ['Company Name', 'GSTIN', 'Address'],
        color: 'emerald'
      },
      {
        id: 'gstr1_auto',
        name: 'GSTR-1 Auto-Fill',
        description: 'Your GSTR-1 gets 90-100% auto-filled every month (B2B + B2C)',
        icon: <FileText size={20} weight="duotone" />,
        enabled: hasCompanyName && hasGSTIN && hasState,
        requiredFields: ['Company Name', 'GSTIN', 'State'],
        color: 'blue'
      },
      {
        id: 'einvoice',
        name: 'E-Invoice & E-Way Bill',
        description: 'One-click e-invoice generation + e-way bill (if turnover > ₹5 Cr)',
        icon: <CloudArrowUp size={20} weight="duotone" />,
        enabled: hasCompanyName && hasGSTIN && hasAddress && hasState,
        requiredFields: ['Company Name', 'GSTIN', 'Address', 'State'],
        color: 'violet'
      },
      {
        id: 'place_of_supply',
        name: 'Place of Supply Detection',
        description: 'GST rate auto-becomes IGST or CGST/SGST based on states',
        icon: <MapPin size={20} weight="duotone" />,
        enabled: hasState,
        requiredFields: ['State'],
        color: 'amber'
      },
      {
        id: 'tcs',
        name: 'TCS Calculation',
        description: 'Amazon/Flipkart 1% TCS auto-calculated in reports',
        icon: <CurrencyInr size={20} weight="duotone" />,
        enabled: hasGSTIN && hasState,
        requiredFields: ['GSTIN', 'State'],
        color: 'orange'
      },
      {
        id: 'receipts',
        name: 'Professional Receipts & Quotations',
        description: 'Branded PDF receipts with logo & GSTIN',
        icon: <Printer size={20} weight="duotone" />,
        enabled: hasCompanyName && hasGSTIN && hasLogo,
        requiredFields: ['Company Name', 'GSTIN', 'Logo'],
        color: 'pink'
      },
      {
        id: 'payment_gateway',
        name: 'Payment Gateway Invoices',
        description: 'Online payment invoices show company name & GSTIN',
        icon: <CreditCard size={20} weight="duotone" />,
        enabled: hasCompanyName && hasGSTIN,
        requiredFields: ['Company Name', 'GSTIN'],
        color: 'cyan'
      },
      {
        id: 'itc_matching',
        name: 'GST Input Credit (ITC) Matching',
        description: 'Purchase Register with ITC reconciliation',
        icon: <ChartLine size={20} weight="duotone" />,
        enabled: hasGSTIN && hasState,
        requiredFields: ['GSTIN', 'State'],
        color: 'teal'
      },
      {
        id: 'export_ca',
        name: 'Export for CA / Tally / Busy',
        description: 'All reports show company name, GSTIN, PAN',
        icon: <Export size={20} weight="duotone" />,
        enabled: hasCompanyName && hasGSTIN && hasPAN,
        requiredFields: ['Company Name', 'GSTIN', 'PAN'],
        color: 'indigo'
      },
      {
        id: 'letterhead',
        name: 'Letterhead & Official Documents',
        description: 'Quotation, Proforma, PO PDFs with full letterhead',
        icon: <FileText size={20} weight="duotone" />,
        enabled: hasCompanyName && hasAddress && hasPhone && hasEmail && hasLogo,
        requiredFields: ['Company Name', 'Address', 'Phone', 'Email', 'Logo'],
        color: 'rose'
      },
      {
        id: 'bank_reconciliation',
        name: 'Bank Statement Reconciliation',
        description: 'Bank uploads match company name accurately',
        icon: <Bank size={20} weight="duotone" />,
        enabled: hasCompanyName && hasBank,
        requiredFields: ['Company Name', 'Bank Details'],
        color: 'sky'
      },
      {
        id: 'gst_portal',
        name: 'GST Portal Integration (Future)',
        description: 'Direct filing from app (like ClearTax, Vyapar)',
        icon: <ShieldCheck size={20} weight="duotone" />,
        enabled: hasCompanyName && hasGSTIN && hasPAN && hasState,
        requiredFields: ['Company Name', 'GSTIN', 'PAN', 'State'],
        color: 'lime'
      }
    ]
  }

  const features = getFeatureStatuses()
  const enabledFeatures = features.filter(f => f.enabled).length
  const isProfileComplete = formData.companyName && formData.gstin && formData.pan && formData.state && formData.phone && formData.email

  // Filter states based on search
  const filteredStates = INDIAN_STATES.filter(state =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    state.code.includes(stateSearch)
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Buildings size={28} weight="duotone" className="text-primary" />
            Company Information
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complete your company profile to unlock all GST & compliance features
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Profile Completion Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
            <div className="relative w-10 h-10">
              <svg className="transform -rotate-90 w-10 h-10">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={100}
                  strokeDashoffset={100 - profileCompletion}
                  className={profileCompletion === 100 ? 'text-emerald-500' : 'text-primary'}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                {profileCompletion}%
              </span>
            </div>
            <div className="text-xs">
              <p className="font-medium">Profile</p>
              <p className="text-muted-foreground">{enabledFeatures}/12 features</p>
            </div>
          </div>

          {/* View Features Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFeatures(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-medium text-sm shadow-lg"
          >
            <Lightning size={18} weight="fill" />
            View Features
          </motion.button>

          {/* Edit/Save Button */}
          {isEditing ? (
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={18} weight="bold" />
                )}
                Save Changes
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
            >
              <Pen size={18} weight="bold" />
              Edit Profile
            </motion.button>
          )}
        </div>
      </div>

      {/* Incomplete Profile Warning */}
      {!isProfileComplete && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl"
        >
          <Warning size={24} weight="fill" className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">Complete Your Profile</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Fill in all required fields (Company Name, GSTIN, PAN, State, Mobile, Email) to unlock GST invoices & auto GSTR-1 filing.
            </p>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                Complete Now <ArrowRight size={14} />
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Logo & Quick Info */}
        <div className="space-y-4">
          {/* Logo Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Image size={16} />
              Business Logo
            </h3>
            <div className="flex flex-col items-center">
              <div
                className={`relative w-32 h-32 rounded-xl border-2 border-dashed ${
                  isEditing ? 'border-primary cursor-pointer hover:bg-primary/5' : 'border-border'
                } flex items-center justify-center overflow-hidden bg-muted/50`}
                onClick={() => isEditing && logoInputRef.current?.click()}
              >
                {formData.logoUrl ? (
                  <>
                    <img
                      src={formData.logoUrl}
                      alt="Company Logo"
                      className="w-full h-full object-contain"
                    />
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <Camera size={32} className="text-muted-foreground mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground">
                      {isEditing ? 'Click to upload' : 'No logo'}
                    </span>
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload('logo', e.target.files[0])}
              />
              {isEditing && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  PNG, JPG up to 2MB<br />Recommended: 200x200px
                </p>
              )}
            </div>
          </div>

          {/* Signature Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Signature size={16} />
              Digital Signature (Optional)
            </h3>
            <div className="flex flex-col items-center">
              <div
                className={`relative w-full h-20 rounded-lg border-2 border-dashed ${
                  isEditing ? 'border-primary cursor-pointer hover:bg-primary/5' : 'border-border'
                } flex items-center justify-center overflow-hidden bg-muted/50`}
                onClick={() => isEditing && signatureInputRef.current?.click()}
              >
                {formData.signatureUrl ? (
                  <>
                    <img
                      src={formData.signatureUrl}
                      alt="Signature"
                      className="max-h-full object-contain"
                    />
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Upload size={20} className="text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {isEditing ? 'Upload signature' : 'Not uploaded'}
                  </span>
                )}
              </div>
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload('signature', e.target.files[0])}
              />
            </div>
          </div>

          {/* Payment QR Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <QrCode size={16} />
              Payment QR Code (Optional)
            </h3>
            <div className="flex flex-col items-center">
              <div
                className={`relative w-28 h-28 rounded-lg border-2 border-dashed ${
                  isEditing ? 'border-primary cursor-pointer hover:bg-primary/5' : 'border-border'
                } flex items-center justify-center overflow-hidden bg-muted/50`}
                onClick={() => isEditing && qrInputRef.current?.click()}
              >
                {formData.paymentQRCode ? (
                  <>
                    <img
                      src={formData.paymentQRCode}
                      alt="Payment QR"
                      className="w-full h-full object-contain"
                    />
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Upload size={20} className="text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground text-center">
                    {isEditing ? 'Upload QR' : 'Not uploaded'}
                  </span>
                )}
              </div>
              <input
                ref={qrInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileUpload('qr', e.target.files[0])}
              />
            </div>

            {/* UPI ID */}
            <div className="mt-4">
              <label className="block text-xs font-medium text-muted-foreground mb-1">UPI ID</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.upiId || ''}
                  onChange={(e) => handleChange('upiId', e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              ) : (
                <p className="text-sm">{formData.upiId || '-'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Form Fields */}
        <div className="lg:col-span-2 space-y-4">
          {/* Company Details Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Buildings size={20} weight="duotone" className="text-primary" />
              Company Details
              {isProfileComplete && (
                <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                  <CheckCircle size={14} weight="fill" />
                  Complete
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => handleChange('companyName', e.target.value)}
                      placeholder="Enter registered company name"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        errors.companyName ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {errors.companyName && (
                      <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>
                    )}
                  </>
                ) : (
                  <p className="text-foreground font-medium">{formData.companyName || '-'}</p>
                )}
              </div>

              {/* Trade Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Trade Name (Optional)
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.tradeName || ''}
                    onChange={(e) => handleChange('tradeName', e.target.value)}
                    placeholder="Brand/Trade name"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <p className="text-foreground">{formData.tradeName || '-'}</p>
                )}
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Business Type
                </label>
                {isEditing ? (
                  <select
                    value={formData.businessType || 'proprietor'}
                    onChange={(e) => handleChange('businessType', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                  >
                    {BUSINESS_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-foreground">
                    {BUSINESS_TYPES.find(t => t.value === formData.businessType)?.label || 'Proprietorship'}
                  </p>
                )}
              </div>

              {/* GSTIN */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  GSTIN <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase ${
                        errors.gstin ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {errors.gstin && (
                      <p className="text-xs text-red-500 mt-1">{errors.gstin}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">State will auto-fill from GSTIN</p>
                  </>
                ) : (
                  <p className="text-foreground font-mono">{formData.gstin || '-'}</p>
                )}
              </div>

              {/* PAN */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  PAN Number <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={formData.pan || ''}
                      onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
                      placeholder="AAAAA0000A"
                      maxLength={10}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase ${
                        errors.pan ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {errors.pan && (
                      <p className="text-xs text-red-500 mt-1">{errors.pan}</p>
                    )}
                  </>
                ) : (
                  <p className="text-foreground font-mono">{formData.pan || '-'}</p>
                )}
              </div>

              {/* CIN (for companies) */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  CIN (Optional)
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.cin || ''}
                    onChange={(e) => handleChange('cin', e.target.value.toUpperCase())}
                    placeholder="For Pvt Ltd / LLP"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase"
                  />
                ) : (
                  <p className="text-foreground font-mono">{formData.cin || '-'}</p>
                )}
              </div>

              {/* Tax Registration Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  GST Registration Type
                </label>
                {isEditing ? (
                  <select
                    value={formData.taxRegistrationType}
                    onChange={(e) => handleChange('taxRegistrationType', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                  >
                    <option value="regular">Regular</option>
                    <option value="composition">Composition</option>
                    <option value="unregistered">Unregistered</option>
                  </select>
                ) : (
                  <p className="text-foreground capitalize">{formData.taxRegistrationType}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Phone size={20} weight="duotone" className="text-emerald-500" />
              Contact Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <>
                    <div className="flex">
                      <span className="px-3 py-2 bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210"
                        className={`w-full px-3 py-2 border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                          errors.phone ? 'border-red-500' : 'border-border'
                        }`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                    )}
                  </>
                ) : (
                  <p className="text-foreground">{formData.phone ? `+91 ${formData.phone}` : '-'}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="company@example.com"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        errors.email ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                    )}
                  </>
                ) : (
                  <p className="text-foreground">{formData.email || '-'}</p>
                )}
              </div>

              {/* Website */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Website (Optional)
                </label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://www.example.com"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <p className="text-foreground">{formData.website || '-'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Address Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin size={20} weight="duotone" className="text-blue-500" />
              Registered Address
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Street Address
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Building, Street, Area"
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                ) : (
                  <p className="text-foreground">{formData.address || '-'}</p>
                )}
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">City</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Enter city"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <p className="text-foreground">{formData.city || '-'}</p>
                )}
              </div>

              {/* State */}
              <div className="relative">
                <label className="block text-sm font-medium text-foreground mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowStateDropdown(!showStateDropdown)}
                      className={`w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background ${
                        errors.state ? 'border-red-500' : 'border-border'
                      }`}
                    >
                      <span className={formData.state ? '' : 'text-muted-foreground'}>
                        {formData.state ? `${formData.stateCode} - ${formData.state}` : 'Select state'}
                      </span>
                      <CaretDown size={16} className={showStateDropdown ? 'rotate-180' : ''} />
                    </button>
                    {errors.state && (
                      <p className="text-xs text-red-500 mt-1">{errors.state}</p>
                    )}

                    {/* State Dropdown */}
                    <AnimatePresence>
                      {showStateDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-hidden"
                        >
                          <div className="p-2 border-b border-border">
                            <input
                              type="text"
                              value={stateSearch}
                              onChange={(e) => setStateSearch(e.target.value)}
                              placeholder="Search state..."
                              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                              autoFocus
                            />
                          </div>
                          <div className="overflow-y-auto max-h-48">
                            {filteredStates.map(state => (
                              <button
                                key={state.code}
                                type="button"
                                onClick={() => handleStateSelect(state)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center justify-between ${
                                  formData.stateCode === state.code ? 'bg-primary/10 text-primary' : ''
                                }`}
                              >
                                <span>{state.name}</span>
                                <span className="text-xs text-muted-foreground">{state.code}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <p className="text-foreground">
                    {formData.state ? `${formData.stateCode} - ${formData.state}` : '-'}
                  </p>
                )}
              </div>

              {/* Pincode */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Pincode</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="400001"
                    maxLength={6}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <p className="text-foreground">{formData.pincode || '-'}</p>
                )}
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Country</label>
                <p className="text-foreground">India</p>
              </div>
            </div>
          </div>

          {/* Bank Details Card */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bank size={20} weight="duotone" className="text-violet-500" />
              Bank Account Details (Optional)
              <span className="ml-auto text-xs text-muted-foreground">For payment receipts</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Bank Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.bankName || ''}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                    placeholder="e.g., HDFC Bank"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <p className="text-foreground">{formData.bankName || '-'}</p>
                )}
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Branch</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.branch || ''}
                    onChange={(e) => handleChange('branch', e.target.value)}
                    placeholder="Branch name"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <p className="text-foreground">{formData.branch || '-'}</p>
                )}
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Account Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.accountNumber || ''}
                    onChange={(e) => handleChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="Account number"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <p className="text-foreground font-mono">
                    {formData.accountNumber ? `****${formData.accountNumber.slice(-4)}` : '-'}
                  </p>
                )}
              </div>

              {/* IFSC Code */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">IFSC Code</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.ifscCode || ''}
                    onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())}
                    placeholder="HDFC0001234"
                    maxLength={11}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase"
                  />
                ) : (
                  <p className="text-foreground font-mono">{formData.ifscCode || '-'}</p>
                )}
              </div>

              {/* Account Holder Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Account Holder Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.accountHolderName || ''}
                    onChange={(e) => handleChange('accountHolderName', e.target.value)}
                    placeholder="Name as per bank records"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : (
                  <p className="text-foreground">{formData.accountHolderName || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Modal */}
      <AnimatePresence>
        {showFeatures && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowFeatures(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Lightning size={24} weight="fill" />
                      12 Powerful Features
                    </h2>
                    <p className="text-white/80 text-sm mt-1">
                      Complete your profile to unlock all GST & compliance features
                    </p>
                  </div>
                  <button
                    onClick={() => setShowFeatures(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>{enabledFeatures} of 12 features enabled</span>
                    <span>{Math.round((enabledFeatures / 12) * 100)}% complete</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(enabledFeatures / 12) * 100}%` }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-xl border ${
                        feature.enabled
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          feature.enabled
                            ? 'bg-emerald-500 text-white'
                            : 'bg-muted-foreground/20 text-muted-foreground'
                        }`}>
                          {feature.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-semibold text-sm ${
                              feature.enabled ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'
                            }`}>
                              {feature.name}
                            </h4>
                            {feature.enabled ? (
                              <CheckCircle size={16} weight="fill" className="text-emerald-500 flex-shrink-0" />
                            ) : (
                              <Lock size={14} className="text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          <p className={`text-xs mt-1 ${
                            feature.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                          }`}>
                            {feature.description}
                          </p>
                          {!feature.enabled && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                              <Info size={12} />
                              Requires: {feature.requiredFields.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* What happens if blank */}
                {!isProfileComplete && (
                  <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <h4 className="font-semibold text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
                      <XCircle size={18} weight="fill" />
                      What happens if you skip this?
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <X size={14} /> GST Invoices show "DUMMY TRADERS"
                      </div>
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <X size={14} /> GSTR-1 requires 100% manual entry
                      </div>
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <X size={14} /> E-invoice not possible
                      </div>
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <X size={14} /> Professional look missing
                      </div>
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                        <X size={14} /> CA will reject reports
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="sticky mobile-sticky-offset bg-card border-t border-border p-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {isProfileComplete ? (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={16} weight="fill" />
                      All required fields complete!
                    </span>
                  ) : (
                    'Complete required fields to unlock all features'
                  )}
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowFeatures(false)
                    if (!isProfileComplete) {
                      setIsEditing(true)
                    }
                  }}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    isProfileComplete
                      ? 'bg-emerald-500 text-white'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {isProfileComplete ? 'Done' : 'Complete Profile Now'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CompanyInfo
