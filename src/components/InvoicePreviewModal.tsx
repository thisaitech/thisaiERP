import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Download,
  Printer,
  Share,
  WhatsappLogo,
  Envelope,
  ChatCircle,
  Check,
  CaretDown,
  FileText,
  Receipt,
  Eye,
  Palette,
  PaperPlaneTilt,
  FilePdf,
  Image,
  Copy,
  CheckCircle,
  ArrowLeft,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { POS58mmTemplate, POS80mmTemplate, KOTTemplate } from './POSTemplates'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'

// Payment details interface for showing on invoice
interface PaymentDetail {
  amount: number
  mode: string // cash, bank, upi, card, cheque
  bankName?: string
  bankAccount?: string
  reference?: string
  date?: string
}

interface InvoicePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  documentType?: 'invoice' | 'quotation' // New prop to determine if it's invoice or quotation
  invoiceData: {
    invoiceNumber: string
    invoiceDate: string
    customerName: string
    customerPhone?: string
    customerVehicleNo?: string
    items: { 
      name: string; 
      quantity: number; 
      price: number; 
      total: number; 
      gst?: number;
      hsn?: string;
      hsnCode?: string;
      cgstAmount?: number;
      sgstAmount?: number;
      igstAmount?: number;
      cgstPercent?: number;
      sgstPercent?: number;
      igstPercent?: number;
      taxMode?: string;
      basePrice?: number;
    }[]
    subtotal: number
    discount: number
    tax: number
    total: number
    received: number
    balance: number
    companyName?: string
    companyPhone?: string
    // Payment details for showing on invoice
    payment?: {
      mode?: string // cash, bank, upi, card, cheque
      bankName?: string
      bankAccount?: string
      reference?: string
      paidAmount?: number
      status?: string
    }
    payments?: PaymentDetail[] // Multiple payments history
  }
}

// Premium Invoice Templates - GST Compliant first, then popular formats
const templates = [
  { id: 'gstcompliant', name: 'GST Compliant' },

  // Paper Sizes (A-Series)
  { id: 'a4', name: '📄 A4', width: 600 },
  { id: 'a5', name: '📄 A5', width: 420 },
  { id: 'a3', name: '📄 A3', width: 840 },
  { id: 'letter', name: 'Letter', width: 600 },

  // POS & Restaurant Formats (Thermal Printer)
  { id: 'pos58mm', name: '🧾 POS 58mm', width: 220 },
  { id: 'pos80mm', name: '🧾 POS 80mm', width: 300 },
  { id: 'kot', name: '🍽️ KOT', width: 220 },
  { id: 'thermal58', name: 'Thermal 58mm', width: 220 },
  { id: 'thermal80', name: 'Thermal 80mm', width: 300 },
  { id: 'receipt', name: 'Receipt', width: 300 },

  // Popular Accounting Software Styles
  { id: 'zoho', name: 'Zoho Style' },
  { id: 'tally', name: 'Tally Style' },
  { id: 'quickbooks', name: 'QuickBooks' },
  { id: 'freshbooks', name: 'FreshBooks' },
  { id: 'xero', name: 'Xero' },
  { id: 'wave', name: 'Wave' },

  // Professional Business Templates
  { id: 'modern', name: 'Modern' },
  { id: 'corporate', name: 'Corporate' },
  { id: 'elegant', name: 'Elegant' },
  { id: 'professional', name: 'Professional' },
  { id: 'executive', name: 'Executive' },
  { id: 'premium', name: 'Premium' },

  // Creative & Stylish
  { id: 'creative', name: 'Creative' },
  { id: 'stylish', name: 'Stylish' },
  { id: 'gradient', name: 'Gradient' },
  { id: 'bold', name: 'Bold' },

  // Clean & Simple
  { id: 'minimal', name: 'Minimal' },
  { id: 'simple', name: 'Simple' },
  { id: 'clean', name: 'Clean' },
  { id: 'compact', name: 'Compact' },

  // Traditional Formats
  { id: 'classic', name: 'Classic' },
  { id: 'traditional', name: 'Traditional' },
  { id: 'standard', name: 'Standard' },
  { id: 'basic', name: 'Basic' },

  // Detailed Formats
  { id: 'detailed', name: 'Detailed' },
  { id: 'itemized', name: 'Itemized' },
  { id: 'comprehensive', name: 'Comprehensive' },
]

const colorSchemes = [
  // Government Standard (Default for GST Compliant)
  { id: 'govblue', primary: '#1e3a8a', secondary: '#dbeafe', accent: '#1e40af', name: 'Govt Blue' },

  // Blue Shades
  { id: 'blue', primary: '#2563EB', secondary: '#DBEAFE', accent: '#2563EB', name: 'Blue' },
  { id: 'navyblue', primary: '#1E3A5F', secondary: '#EFF6FF', accent: '#1E40AF', name: 'Navy' },
  { id: 'royalblue', primary: '#1e40af', secondary: '#dbeafe', accent: '#3b82f6', name: 'Royal Blue' },
  { id: 'skyblue', primary: '#0ea5e9', secondary: '#e0f2fe', accent: '#38bdf8', name: 'Sky Blue' },
  { id: 'lightblue', primary: '#60A5FA', secondary: '#EFF6FF', accent: '#3B82F6', name: 'Light Blue' },

  // Green Shades
  { id: 'emerald', primary: '#059669', secondary: '#D1FAE5', accent: '#059669', name: 'Emerald' },
  { id: 'green', primary: '#16a34a', secondary: '#dcfce7', accent: '#22c55e', name: 'Green' },
  { id: 'teal', primary: '#0D9488', secondary: '#CCFBF1', accent: '#14B8A6', name: 'Teal' },
  { id: 'lime', primary: '#4ADE80', secondary: '#F0FDF4', accent: '#22C55E', name: 'Lime' },
  { id: 'mint', primary: '#2DD4BF', secondary: '#F0FDFA', accent: '#14B8A6', name: 'Mint' },
  { id: 'forest', primary: '#14532D', secondary: '#F0FDF4', accent: '#166534', name: 'Forest' },

  // Purple & Pink Shades
  { id: 'purple', primary: '#7C3AED', secondary: '#EDE9FE', accent: '#7C3AED', name: 'Purple' },
  { id: 'violet', primary: '#8b5cf6', secondary: '#f5f3ff', accent: '#a78bfa', name: 'Violet' },
  { id: 'indigo', primary: '#4F46E5', secondary: '#E0E7FF', accent: '#6366F1', name: 'Indigo' },
  { id: 'lavender', primary: '#A78BFA', secondary: '#F5F3FF', accent: '#8B5CF6', name: 'Lavender' },
  { id: 'fuchsia', primary: '#c026d3', secondary: '#fae8ff', accent: '#d946ef', name: 'Fuchsia' },
  { id: 'pink', primary: '#F472B6', secondary: '#FDF2F8', accent: '#EC4899', name: 'Pink' },
  { id: 'rose', primary: '#E11D48', secondary: '#FFE4E6', accent: '#E11D48', name: 'Rose' },

  // Orange & Red Shades
  { id: 'red', primary: '#dc2626', secondary: '#fee2e2', accent: '#ef4444', name: 'Red' },
  { id: 'crimson', primary: '#991b1b', secondary: '#fee2e2', accent: '#dc2626', name: 'Crimson' },
  { id: 'orange', primary: '#EA580C', secondary: '#FFEDD5', accent: '#F97316', name: 'Orange' },
  { id: 'amber', primary: '#D97706', secondary: '#FEF3C7', accent: '#D97706', name: 'Amber' },
  { id: 'peach', primary: '#FB923C', secondary: '#FFF7ED', accent: '#F97316', name: 'Peach' },
  { id: 'coral', primary: '#FF6B6B', secondary: '#FFF5F5', accent: '#F56565', name: 'Coral' },

  // Yellow & Gold Shades
  { id: 'yellow', primary: '#eab308', secondary: '#fef9c3', accent: '#facc15', name: 'Yellow' },
  { id: 'gold', primary: '#D4AF37', secondary: '#FFFBEB', accent: '#F59E0B', name: 'Gold' },
  { id: 'mustard', primary: '#ca8a04', secondary: '#fef3c7', accent: '#eab308', name: 'Mustard' },

  // Cyan & Aqua Shades
  { id: 'cyan', primary: '#0891B2', secondary: '#CFFAFE', accent: '#06B6D4', name: 'Cyan' },
  { id: 'aqua', primary: '#06b6d4', secondary: '#cffafe', accent: '#22d3ee', name: 'Aqua' },
  { id: 'turquoise', primary: '#14b8a6', secondary: '#ccfbf1', accent: '#2dd4bf', name: 'Turquoise' },

  // Neutral & Dark Colors
  { id: 'slate', primary: '#475569', secondary: '#F1F5F9', accent: '#475569', name: 'Slate' },
  { id: 'gray', primary: '#6b7280', secondary: '#f3f4f6', accent: '#9ca3af', name: 'Gray' },
  { id: 'charcoal', primary: '#374151', secondary: '#f9fafb', accent: '#4b5563', name: 'Charcoal' },
  { id: 'midnight', primary: '#312E81', secondary: '#EEF2FF', accent: '#4338CA', name: 'Midnight' },
  { id: 'black', primary: '#18181B', secondary: '#F4F4F5', accent: '#27272A', name: 'Black' },

  // Premium/Rich Colors
  { id: 'burgundy', primary: '#7F1D1D', secondary: '#FEF2F2', accent: '#B91C1C', name: 'Wine' },
  { id: 'maroon', primary: '#881337', secondary: '#fce7f3', accent: '#be123c', name: 'Maroon' },
  { id: 'brown', primary: '#78350f', secondary: '#fef3c7', accent: '#92400e', name: 'Brown' },
  { id: 'olive', primary: '#4d7c0f', secondary: '#ecfccb', accent: '#65a30d', name: 'Olive' },
]

export default function InvoicePreviewModal({ isOpen, onClose, documentType = 'invoice', invoiceData }: InvoicePreviewModalProps) {
  // Load saved preferences from localStorage
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    try {
      return localStorage.getItem('invoice_template') || 'gstcompliant'
    } catch { return 'gstcompliant' }
  })
  const [selectedColor, setSelectedColor] = useState(() => {
    try {
      const savedColorId = localStorage.getItem('invoice_color')
      return colorSchemes.find(c => c.id === savedColorId) || colorSchemes[0]
    } catch { return colorSchemes[0] }
  })
  const [activeTab, setActiveTab] = useState<'design' | 'share' | 'print'>('print') // Default to print to show invoice directly
  // Auto-detect mobile and set appropriate default zoom
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth
    if (typeof document !== 'undefined') return document.documentElement.clientWidth
    return 1280
  })
  const isMobile = viewportWidth < 640
  const [zoom, setZoom] = useState(100) // Default 100%, mobile scaling handled by mobileBaseScale
  const [copied, setCopied] = useState(false)

  // Pinch-to-zoom state
  const [touchDistance, setTouchDistance] = useState(0)
  const [initialZoom, setInitialZoom] = useState(100)
  const [selectedPaperSize, setSelectedPaperSize] = useState<'a4' | 'letter' | 'a5' | 'thermal3' | 'thermal2'>(() => {
    try {
      return (localStorage.getItem('invoice_paperSize') as any) || 'a4'
    } catch { return 'a4' }
  })
  const [showSidebar, setShowSidebar] = useState(false) // Hidden by default to show invoice

  // Save preferences to localStorage when they change
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId)
    try { localStorage.setItem('invoice_template', templateId) } catch {}
  }
  const handleColorChange = (color: typeof colorSchemes[0]) => {
    setSelectedColor(color)
    try { localStorage.setItem('invoice_color', color.id) } catch {}
  }
  const handlePaperSizeChange = (size: 'a4' | 'letter' | 'a5' | 'thermal3' | 'thermal2') => {
    setSelectedPaperSize(size)
    try { localStorage.setItem('invoice_paperSize', size) } catch {}
  }

  // Get paper size dimensions
  const getPaperSizeDimensions = (size: string) => {
    const sizes = {
      a4: { width: 600, height: 842 },
      a5: { width: 420, height: 595 },
      letter: { width: 600, height: 776 },
      thermal3: { width: 300, height: 'auto' },
      thermal2: { width: 220, height: 'auto' }
    }
    return sizes[size as keyof typeof sizes] || sizes.a4
  }

  const paperDimensions = getPaperSizeDimensions(selectedPaperSize)
  const availableWidth = Math.max(320, viewportWidth - 16) // Reduced margin for mobile
  const maxPreviewWidth = Math.min(paperDimensions.width, availableWidth)
  const fitRatio = availableWidth / paperDimensions.width
  // On mobile, always scale down to fit the screen width, then apply user zoom on top
  // This ensures the invoice fits at 100% zoom on mobile
  const mobileBaseScale = isMobile ? Math.min(fitRatio, 1) : 1
  const computedScale = Math.min(
    Math.max((zoom / 100) * mobileBaseScale, 0.3),
    2
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => {
      const newWidth = window.innerWidth
      setViewportWidth(newWidth)
      // No need to auto-adjust zoom - mobileBaseScale handles fitting automatically
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [paperDimensions.width])

  // Pinch-to-zoom handler for mobile
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return

    const previewElement = document.getElementById('invoice-preview-container')
    if (!previewElement) return

    const getTouchDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0
      const touch1 = touches[0]
      const touch2 = touches[1]
      const dx = touch1.clientX - touch2.clientX
      const dy = touch1.clientY - touch2.clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const distance = getTouchDistance(e.touches)
        setTouchDistance(distance)
        setInitialZoom(zoom)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchDistance > 0) {
        e.preventDefault()
        const currentDistance = getTouchDistance(e.touches)
        const scale = currentDistance / touchDistance
        const newZoom = Math.min(200, Math.max(50, initialZoom * scale))
        setZoom(Math.round(newZoom))
      }
    }

    const handleTouchEnd = () => {
      setTouchDistance(0)
    }

    previewElement.addEventListener('touchstart', handleTouchStart, { passive: false })
    previewElement.addEventListener('touchmove', handleTouchMove, { passive: false })
    previewElement.addEventListener('touchend', handleTouchEnd)

    return () => {
      previewElement.removeEventListener('touchstart', handleTouchStart)
      previewElement.removeEventListener('touchmove', handleTouchMove)
      previewElement.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, touchDistance, initialZoom, zoom])

  // Get recommended template for paper size
  const getTemplateForPaperSize = (size: string) => {
    if (size === 'thermal3') return 'pos80mm'
    if (size === 'thermal2') return 'pos58mm'
    return selectedTemplate
  }

  // Compute active template considering paper size
  const activeTemplate = getTemplateForPaperSize(selectedPaperSize)

  const generateShareMessage = () => {
    const itemsList = invoiceData.items.map(item => `${item.name} x${item.quantity} = ₹${item.total.toLocaleString('en-IN')}`).join('\n')
    return `📄 *Invoice #${invoiceData.invoiceNumber}*\n\n` +
      `Customer: ${invoiceData.customerName}\n` +
      `Date: ${invoiceData.invoiceDate}\n\n` +
      `*Items:*\n${itemsList}\n\n` +
      `Subtotal: ₹${invoiceData.subtotal.toLocaleString('en-IN')}\n` +
      `Tax: ₹${invoiceData.tax.toLocaleString('en-IN')}\n` +
      `*Total: ₹${invoiceData.total.toLocaleString('en-IN')}*\n\n` +
      `Thank you for your business! 🙏`
  }

  const handleShare = (platform: string) => {
    const message = generateShareMessage()
    const encodedMessage = encodeURIComponent(message)
    const phone = invoiceData.customerPhone?.replace(/\D/g, '') || ''

    switch (platform) {
      case 'WhatsApp':
        // Open WhatsApp with pre-filled message
        const whatsappUrl = phone
          ? `https://wa.me/91${phone}?text=${encodedMessage}`
          : `https://wa.me/?text=${encodedMessage}`
        window.open(whatsappUrl, '_blank')
        toast.success('Opening WhatsApp...')
        break
      case 'Email':
        const subject = encodeURIComponent(`Invoice #${invoiceData.invoiceNumber} - ${invoiceData.companyName || 'Invoice'}`)
        const body = encodeURIComponent(message.replace(/\*/g, ''))
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
        toast.success('Opening Email...')
        break
      case 'SMS':
        const smsMessage = `Invoice #${invoiceData.invoiceNumber}\nTotal: ₹${invoiceData.total.toLocaleString('en-IN')}\nThank you!`
        const smsUrl = phone
          ? `sms:${phone}?body=${encodeURIComponent(smsMessage)}`
          : `sms:?body=${encodeURIComponent(smsMessage)}`
        window.open(smsUrl, '_blank')
        toast.success('Opening SMS...')
        break
      default:
        toast.success(`Sharing via ${platform}...`)
    }
  }

  const handleDownload = async (format: string) => {
    try {
      toast.success(`Preparing ${format} download...`)

      if (format === 'Image') {
        // Download as PNG image using dom-to-image (better oklch support)
        const previewElement = document.getElementById('invoice-preview-content')

        if (!previewElement) {
          toast.error('Invoice preview not found')
          return
        }

        // Save current transform
        const originalTransform = previewElement.style.transform
        previewElement.style.setProperty('transform', 'scale(1)', 'important')

        // Wait for transform to apply
        await new Promise(resolve => setTimeout(resolve, 150))

        try {
          const domtoimage = await import('dom-to-image-more')

          const blob = await domtoimage.toBlob(previewElement, {
            width: previewElement.scrollWidth * 2,
            height: previewElement.scrollHeight * 2,
            quality: 1,
            bgcolor: '#ffffff',
            style: {
              transform: 'scale(2)',
              transformOrigin: 'top left'
            }
          })

          // Restore original transform
          previewElement.style.transform = originalTransform

          const filename = `Invoice-${invoiceData.invoiceNumber}.png`
          const platform = Capacitor.getPlatform()

          // For Android/iOS native apps, use Capacitor Filesystem
          if (platform === 'android' || platform === 'ios') {
            try {
              // Convert blob to base64
              const reader = new FileReader()
              const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  const base64data = reader.result as string
                  resolve(base64data.split(',')[1]) // Remove data URI prefix
                }
                reader.onerror = reject
              })
              reader.readAsDataURL(blob)

              const base64Data = await base64Promise

              const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Documents,
                recursive: true
              })

              console.log('PNG saved to:', result.uri)
              toast.success('Image saved to Documents folder!')
            } catch (err) {
              console.error('Capacitor save failed for PNG:', err)
              toast.error('Failed to save image')
            }
          } else {
            // Web fallback - Download the blob
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            toast.success('Image downloaded successfully!')
          }
        } catch (error) {
          // Restore transform on error
          previewElement.style.transform = originalTransform
          console.error('Image generation error:', error)
          toast.error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        return
      }

      // PDF Download
      const { generateInvoicePDF } = await import('../services/pdfService')
      const { getCompanySettings } = await import('../services/settingsService')

      const companySettings = getCompanySettings()

      // Build PDF data
      const pdfData = {
        type: 'sale' as const,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.invoiceDate,
        partyName: invoiceData.customerName,
        partyPhone: invoiceData.customerPhone || '',
        partyAddress: '',
        partyGSTIN: '',
        items: invoiceData.items.map((item: any) => ({
          name: item.name,
          hsnCode: item.hsn || '',
          quantity: item.quantity,
          unit: 'NONE',
          rate: item.price,
          discount: 0,
          taxRate: item.gst || 0,
          cgst: ((item.price * item.quantity * (item.gst || 0)) / 100) / 2,
          sgst: ((item.price * item.quantity * (item.gst || 0)) / 100) / 2,
          amount: item.total
        })),
        subtotal: invoiceData.subtotal,
        discount: invoiceData.discount,
        cgstAmount: invoiceData.tax / 2,
        sgstAmount: invoiceData.tax / 2,
        totalTax: invoiceData.tax,
        grandTotal: invoiceData.total,
        roundOff: 0,
        paidAmount: invoiceData.received,
        balanceDue: invoiceData.balance,
        notes: '',
        termsAndConditions: '',
        companyName: companySettings.companyName || 'Your Company',
        companyAddress: companySettings.address || '',
        companyPhone: companySettings.phone || '',
        companyEmail: companySettings.email || '',
        companyGSTIN: companySettings.gstin || ''
      }

      // Generate and download PDF
      const doc = generateInvoicePDF(pdfData)
      doc.save(`Invoice-${invoiceData.invoiceNumber}.pdf`)

      toast.success('PDF downloaded successfully!')
    } catch (error) {
      console.error('Error downloading:', error)
      toast.error(`Failed to download: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handlePrint = async (type: string) => {
    try {
      toast.success(`Preparing ${type} print...`)

      // Import PDF service
      const { printInvoicePDF } = await import('../services/pdfService')
      const { getCompanySettings } = await import('../services/settingsService')

      const companySettings = getCompanySettings()

      // Build PDF data
      const pdfData = {
        type: 'sale' as const,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        dueDate: invoiceData.invoiceDate,
        partyName: invoiceData.customerName,
        partyPhone: invoiceData.customerPhone || '',
        partyAddress: '',
        partyGSTIN: '',
        items: invoiceData.items.map((item: any) => ({
          name: item.name,
          hsnCode: item.hsn || '',
          quantity: item.quantity,
          unit: 'NONE',
          rate: item.price,
          discount: 0,
          taxRate: item.gst || 0,
          cgst: ((item.price * item.quantity * (item.gst || 0)) / 100) / 2,
          sgst: ((item.price * item.quantity * (item.gst || 0)) / 100) / 2,
          amount: item.total
        })),
        subtotal: invoiceData.subtotal,
        discount: invoiceData.discount,
        cgstAmount: invoiceData.tax / 2,
        sgstAmount: invoiceData.tax / 2,
        totalTax: invoiceData.tax,
        grandTotal: invoiceData.total,
        roundOff: 0,
        paidAmount: invoiceData.received,
        balanceDue: invoiceData.balance,
        notes: '',
        termsAndConditions: '',
        companyName: companySettings.companyName || 'Your Company',
        companyAddress: companySettings.address || '',
        companyPhone: companySettings.phone || '',
        companyEmail: companySettings.email || '',
        companyGSTIN: companySettings.gstin || ''
      }

      // Print PDF
      printInvoicePDF(pdfData)

      toast.success('Opening print dialog...')
    } catch (error) {
      console.error('Error printing PDF:', error)
      toast.error('Failed to print PDF')
    }
  }

  const copyInvoiceLink = () => {
    const baseUrl = window.location.origin
    const invoiceUrl = `${baseUrl}/#/sales?invoice=${invoiceData.invoiceNumber}`
    navigator.clipboard.writeText(invoiceUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Invoice link copied!')
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-0 sm:inset-2 bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Compact Header */}
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={18} className="text-slate-600" />
              </button>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                  {documentType === 'quotation' ? 'Quotation' : 'Invoice'} Preview
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500">#{invoiceData.invoiceNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Zoom Controls - Compact */}
              <div className="flex items-center bg-slate-100 rounded-md">
                <button
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                  className="p-1 hover:bg-white rounded-l-md transition-colors disabled:opacity-50"
                  disabled={zoom <= 50}
                >
                  <MagnifyingGlassMinus size={14} />
                </button>
                <span className="text-[10px] font-medium w-10 text-center">{zoom}%</span>
                <button
                  onClick={() => setZoom(Math.min(200, zoom + 10))}
                  className="p-1 hover:bg-white rounded-r-md transition-colors disabled:opacity-50"
                  disabled={zoom >= 200}
                >
                  <MagnifyingGlassPlus size={14} />
                </button>
              </div>

              <button
                onClick={() => {
                  onClose()
                }}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold text-[10px] sm:text-xs hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md"
              >
                Save & Close
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Floating Options Panel - Small overlay */}
            {showSidebar && (
              <>
                {/* Backdrop - click to close */}
                <div 
                  className="absolute inset-0 bg-black/20 z-20" 
                  onClick={() => setShowSidebar(false)}
                />
                {/* Floating Panel */}
                <div className="absolute left-2 top-2 z-30 w-64 max-h-[80%] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-700">Options</span>
                    <button onClick={() => setShowSidebar(false)} className="p-1 hover:bg-slate-200 rounded">
                      <X size={14} />
                    </button>
                  </div>
                  {/* Tab Navigation - Compact */}
                  <div className="flex border-b border-slate-200">
                    {[
                      { id: 'design', label: 'Design', icon: Palette },
                      { id: 'share', label: 'Share', icon: PaperPlaneTilt },
                      { id: 'print', label: 'Print', icon: Printer },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                          "flex-1 py-2 text-[10px] font-medium transition-all flex items-center justify-center gap-1",
                          activeTab === tab.id
                            ? "text-emerald-600 border-b-2 border-emerald-500 bg-white"
                            : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                        )}
                      >
                        <tab.icon size={12} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-3 max-h-[60vh]">
                {activeTab === 'design' && (
                  <div className="space-y-6">
                    {/* Template Selection - GST Compliant First */}
                    <div>
                      <h3 className="text-xs font-semibold text-slate-700 mb-2">Templates</h3>

                      {/* GST Compliant - Featured */}
                      <button
                        onClick={() => handleTemplateChange('gstcompliant')}
                        className={cn(
                          "w-full px-4 py-3 rounded-lg border-2 text-sm font-semibold transition-all mb-3",
                          selectedTemplate === 'gstcompliant'
                            ? "border-blue-600 bg-blue-600 text-white shadow-lg"
                            : "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        )}
                      >
                        🏛️ GST Compliant Invoice
                      </button>

                      {/* Paper Sizes */}
                      <p className="text-[10px] font-semibold text-slate-500 mb-1.5 mt-3">📄 PAPER SIZES</p>
                      <div className="grid grid-cols-4 gap-1.5 mb-3">
                        {['a4', 'a5', 'a3', 'letter'].map((id) => {
                          const template = templates.find(t => t.id === id)
                          return (
                            <button
                              key={id}
                              onClick={() => handleTemplateChange(id)}
                              className={cn(
                                "px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
                                selectedTemplate === id
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                              )}
                            >
                              {template?.name}
                            </button>
                          )
                        })}
                      </div>

                      {/* POS & Restaurant Formats */}
                      <p className="text-[10px] font-semibold text-slate-500 mb-1.5">🧾 POS & RESTAURANT</p>
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {['pos58mm', 'pos80mm', 'kot', 'thermal58', 'thermal80', 'receipt'].map((id) => {
                          const template = templates.find(t => t.id === id)
                          return (
                            <button
                              key={id}
                              onClick={() => handleTemplateChange(id)}
                              className={cn(
                                "px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all",
                                selectedTemplate === id
                                  ? "border-orange-500 bg-orange-50 text-orange-700"
                                  : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                              )}
                            >
                              {template?.name}
                            </button>
                          )
                        })}
                      </div>

                      {/* Popular Accounting Software */}
                      <p className="text-[10px] font-semibold text-slate-500 mb-1.5">💼 POPULAR SOFTWARE</p>
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {['zoho', 'tally', 'quickbooks', 'freshbooks', 'xero', 'wave'].map((id) => {
                          const template = templates.find(t => t.id === id)
                          return (
                            <button
                              key={id}
                              onClick={() => handleTemplateChange(id)}
                              className={cn(
                                "px-2 py-1.5 rounded-lg border text-xs font-medium transition-all",
                                selectedTemplate === id
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                              )}
                            >
                              {template?.name}
                            </button>
                          )
                        })}
                      </div>

                      {/* Other Templates */}
                      <p className="text-[10px] font-semibold text-slate-500 mb-1.5">📄 OTHER STYLES</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {templates.slice(17).map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateChange(template.id)}
                            className={cn(
                              "px-2 py-1.5 rounded-lg border text-xs font-medium transition-all",
                              selectedTemplate === template.id
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                            )}
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Color Scheme - Compact */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-slate-700">Colors</h3>
                        {selectedTemplate === 'gstcompliant' && (
                          <span className="text-[10px] text-blue-600 font-medium">
                            🏛️ Blue = Govt Standard
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-6 gap-1.5">
                        {colorSchemes.map((color) => (
                          <button
                            key={color.id}
                            onClick={() => handleColorChange(color)}
                            className={cn(
                              "relative rounded-lg transition-all aspect-square",
                              selectedColor.id === color.id
                                ? "ring-2 ring-offset-1 ring-slate-400 scale-110"
                                : "hover:scale-110"
                            )}
                            style={{ backgroundColor: color.primary }}
                            title={color.name}
                          >
                            {selectedColor.id === color.id && (
                              <Check size={12} weight="bold" className="absolute inset-0 m-auto text-white drop-shadow-lg" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'share' && (
                  <div className="space-y-6">
                    {/* Quick Share */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Share</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => handleShare('WhatsApp')}
                          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all group"
                        >
                          <WhatsappLogo size={28} weight="fill" className="text-green-500" />
                          <span className="text-xs font-medium text-slate-600 group-hover:text-green-600">WhatsApp</span>
                        </button>
                        <button
                          onClick={() => handleShare('Email')}
                          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                        >
                          <Envelope size={28} weight="fill" className="text-blue-500" />
                          <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600">Email</span>
                        </button>
                        <button
                          onClick={() => handleShare('SMS')}
                          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all group"
                        >
                          <ChatCircle size={28} weight="fill" className="text-purple-500" />
                          <span className="text-xs font-medium text-slate-600 group-hover:text-purple-600">SMS</span>
                        </button>
                      </div>
                    </div>

                    {/* Copy Link */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Invoice Link</h3>
                      <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/#/sales?invoice=${invoiceData.invoiceNumber}`}
                          className="flex-1 text-sm text-slate-600 bg-transparent outline-none"
                        />
                        <button
                          onClick={copyInvoiceLink}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            copied
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Download Options */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Download</h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => handleDownload('PDF')}
                          className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all group"
                        >
                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <FilePdf size={20} className="text-red-500" />
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-medium text-slate-700 group-hover:text-red-600">Download PDF</span>
                            <p className="text-xs text-slate-400">High quality PDF file</p>
                          </div>
                        </button>
                        <button
                          onClick={() => handleDownload('Image')}
                          className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
                        >
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Image size={20} className="text-blue-500" />
                          </div>
                          <div className="text-left">
                            <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">Download Image</span>
                            <p className="text-xs text-slate-400">PNG format for sharing</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'print' && (
                  <div className="space-y-6">
                    {/* Print Formats */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Paper Size</h3>
                      <div className="space-y-2">
                        {[
                          { id: 'a4', name: 'A4 Standard', desc: '210 x 297 mm', icon: '📄' },
                          { id: 'a5', name: 'A5 Half', desc: '148 x 210 mm', icon: '📃' },
                          { id: 'letter', name: 'Letter', desc: '8.5 x 11 inch', icon: '📋' },
                        ].map((size) => (
                          <button
                            key={size.id}
                            onClick={() => handlePaperSizeChange(size.id as any)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl border transition-all group",
                              selectedPaperSize === size.id
                                ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200"
                                : "bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
                            )}
                          >
                            <span className="text-2xl">{size.icon}</span>
                            <div className="text-left flex-1">
                              <span className="text-sm font-medium text-slate-700">{size.name}</span>
                              <p className="text-xs text-slate-400">{size.desc}</p>
                            </div>
                            {selectedPaperSize === size.id && (
                              <Check size={18} className="text-emerald-500" weight="bold" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Thermal Print */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 mb-3">Thermal Print</h3>
                      <div className="space-y-2">
                        {[
                          { id: 'thermal3', name: '3 inch Roll', desc: '80mm thermal paper' },
                          { id: 'thermal2', name: '2 inch Roll', desc: '58mm thermal paper' },
                        ].map((size) => (
                          <button
                            key={size.id}
                            onClick={() => handlePaperSizeChange(size.id as any)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-xl border transition-all group",
                              selectedPaperSize === size.id
                                ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200"
                                : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              selectedPaperSize === size.id ? "bg-amber-200" : "bg-amber-100"
                            )}>
                              <Receipt size={20} className="text-amber-600" />
                            </div>
                            <div className="text-left flex-1">
                              <span className="text-sm font-medium text-slate-700">{size.name}</span>
                              <p className="text-xs text-slate-400">{size.desc}</p>
                            </div>
                            {selectedPaperSize === size.id && (
                              <Check size={18} className="text-amber-600" weight="bold" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Print Preview Button */}
                    <button
                      onClick={() => handlePrint(selectedPaperSize)}
                      className="w-full py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl font-semibold text-sm hover:from-slate-800 hover:to-slate-900 transition-all flex items-center justify-center gap-2"
                    >
                      <Eye size={18} />
                      Print Preview
                    </button>
                  </div>
                )}
              </div>
            </div>
              </>
            )}

            {/* Invoice Preview - Full Width */}
            <div id="invoice-preview-container" className="flex-1 bg-gradient-to-br from-slate-100 to-slate-200 p-1 sm:p-4 pb-24 sm:pb-20 overflow-x-hidden overflow-y-auto">
              {/* Toggle Options Button - Compact */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="fixed bottom-20 sm:bottom-4 left-4 z-10 px-3 py-2 bg-white rounded-lg shadow-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-medium text-slate-700 border border-slate-200"
              >
                <Palette size={14} />
                <span>Options</span>
              </button>

              {/* Wrapper to handle scaled content size for proper scrolling */}
              <div
                className="flex justify-center w-full"
                style={{
                  maxWidth: '100%',
                }}
              >
              <div
              id="invoice-preview-content"
              className="bg-white shadow-2xl rounded-lg overflow-hidden transition-all mb-16"
              style={{
                // Use CSS zoom which properly scales everything including layout
                // On mobile, apply user zoom on top of base fit ratio
                zoom: isMobile ? (availableWidth / paperDimensions.width) * (zoom / 100) : computedScale,
                width: `${paperDimensions.width}px`,
                minHeight: paperDimensions.height === 'auto'
                  ? 'auto'
                  : `${paperDimensions.height}px`,
                boxSizing: 'border-box',
              }}
            >
                {/* Invoice Content Based on Template */}
                {activeTemplate === 'modern' && (
                  <ModernTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'classic' && (
                  <ClassicTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'bold' && (
                  <BoldTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'elegant' && (
                  <ElegantTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'minimal' && (
                  <MinimalTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'corporate' && (
                  <CorporateTemplate data={invoiceData} color={selectedColor} documentType={documentType} />
                )}
                {activeTemplate === 'taxinvoice' && (
                  <TaxInvoiceTemplate data={invoiceData} color={selectedColor} documentType={documentType} />
                )}
                {activeTemplate === 'gstcompliant' && (
                  <GSTCompliantTemplate data={invoiceData} color={selectedColor} documentType={documentType} paperSize={selectedPaperSize} />
                )}
                {activeTemplate === 'gradient' && (
                  <GradientTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'striped' && (
                  <StripedTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'compact' && (
                  <CompactTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'premium' && (
                  <PremiumTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'invoice' && (
                  <InvoiceTemplate data={invoiceData} color={selectedColor} documentType={documentType} />
                )}
                {activeTemplate === 'receipt' && (
                  <ReceiptTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'zoho' && (
                  <ZohoTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'tally' && (
                  <TallyTemplate data={invoiceData} color={selectedColor} documentType={documentType} />
                )}
                {activeTemplate === 'gst' && (
                  <GSTTemplate data={invoiceData} color={selectedColor} documentType={documentType} />
                )}
                {activeTemplate === 'simple' && (
                  <SimpleTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'bordered' && (
                  <BorderedTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'watermark' && (
                  <WatermarkTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'split' && (
                  <SplitTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'corner' && (
                  <CornerTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'dotted' && (
                  <DottedTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'floral' && (
                  <FloralTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'wave' && (
                  <WaveTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'ribbon' && (
                  <RibbonTemplate data={invoiceData} color={selectedColor} />
                )}
                {/* Popular Accounting Software Templates */}
                {activeTemplate === 'quickbooks' && (
                  <ModernTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'freshbooks' && (
                  <ElegantTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'xero' && (
                  <MinimalTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'clean' && (
                  <MinimalTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'traditional' && (
                  <ClassicTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'professional' && (
                  <CorporateTemplate data={invoiceData} color={selectedColor} documentType={documentType} />
                )}
                {activeTemplate === 'executive' && (
                  <CorporateTemplate data={invoiceData} color={selectedColor} documentType={documentType} />
                )}
                {activeTemplate === 'creative' && (
                  <ModernTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'stylish' && (
                  <ElegantTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'standard' && (
                  <ClassicTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'basic' && (
                  <SimpleTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'detailed' && (
                  <GSTCompliantTemplate data={invoiceData} color={selectedColor} documentType={documentType} paperSize={selectedPaperSize} />
                )}
                {activeTemplate === 'itemized' && (
                  <CompactTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'comprehensive' && (
                  <GSTCompliantTemplate data={invoiceData} color={selectedColor} documentType={documentType} paperSize={selectedPaperSize} />
                )}
                {/* POS & Restaurant Formats */}
                {activeTemplate === 'pos58mm' && (
                  <POS58mmTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'pos80mm' && (
                  <POS80mmTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'kot' && (
                  <KOTTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'thermal58' && (
                  <POS58mmTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'thermal80' && (
                  <POS80mmTemplate data={invoiceData} color={selectedColor} />
                )}
                {/* Paper Sizes */}
                {activeTemplate === 'a4' && (
                  <GSTCompliantTemplate data={invoiceData} color={selectedColor} documentType={documentType} paperSize={selectedPaperSize} />
                )}
                {activeTemplate === 'a5' && (
                  <CompactTemplate data={invoiceData} color={selectedColor} />
                )}
                {activeTemplate === 'a3' && (
                  <GSTCompliantTemplate data={invoiceData} color={selectedColor} documentType={documentType} paperSize={selectedPaperSize} />
                )}
                {activeTemplate === 'letter' && (
                  <ModernTemplate data={invoiceData} color={selectedColor} />
                )}
              </div>
              </div>

              {/* Floating Share Bar - Mobile optimized */}
              <div className="fixed left-1/2 -translate-x-1/2 z-20 w-full sm:w-auto px-2 sm:px-0" style={{ bottom: 'max(env(safe-area-inset-bottom, 0px) + 12px, 16px)' }}>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="flex items-center justify-center gap-2 sm:gap-1.5 px-3 sm:px-3 py-2.5 sm:py-2 bg-white/98 backdrop-blur-sm rounded-2xl sm:rounded-full shadow-xl border border-slate-200"
                >
                  <button
                    onClick={() => handleShare('WhatsApp')}
                    className="p-2.5 sm:p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all"
                    title="WhatsApp"
                  >
                    <WhatsappLogo size={20} weight="fill" className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button
                    onClick={() => handleShare('Email')}
                    className="p-2.5 sm:p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-all"
                    title="Email"
                  >
                    <Envelope size={20} weight="fill" className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button
                    onClick={() => handleShare('SMS')}
                    className="p-2.5 sm:p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-all hidden sm:block"
                    title="SMS"
                  >
                    <ChatCircle size={18} weight="fill" />
                  </button>
                  <div className="w-px h-6 sm:h-5 bg-slate-300 mx-1" />
                  <button
                    onClick={() => handleDownload('PDF')}
                    className="p-2.5 sm:p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all"
                    title="Download PDF"
                  >
                    <FilePdf size={20} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button
                    onClick={() => handleDownload('Image')}
                    className="p-2.5 sm:p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all sm:hidden"
                    title="Download Image"
                  >
                    <Image size={20} />
                  </button>
                  <button
                    onClick={() => handlePrint('A4')}
                    className="p-2.5 sm:p-2 bg-slate-700 hover:bg-slate-800 text-white rounded-full transition-all"
                    title="Print"
                  >
                    <Printer size={20} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Modern Template
function ModernTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-3"
            style={{ backgroundColor: color.primary }}
          >
            {(data.companyName || 'C')[0]}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{data.companyName || 'Your Company'}</h1>
          <p className="text-slate-500 text-sm">{data.companyPhone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold" style={{ color: color.primary }}>INVOICE</h2>
          <p className="text-slate-500 mt-1">#{data.invoiceNumber}</p>
          <p className="text-slate-500">{data.invoiceDate}</p>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8 p-4 rounded-xl" style={{ backgroundColor: color.secondary }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: color.primary }}>Bill To</p>
        <p className="text-lg font-semibold text-slate-800">{data.customerName}</p>
        {data.customerPhone && <p className="text-slate-500 text-sm">{data.customerPhone}</p>}
        {data.customerVehicleNo && <p className="text-slate-500 text-sm">Vehicle: {data.customerVehicleNo}</p>}
      </div>

      {/* Items */}
      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2" style={{ borderColor: color.primary }}>
            <th className="text-left py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Item</th>
            <th className="text-center py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Qty</th>
            <th className="text-right py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Price</th>
            <th className="text-right py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item: any, i: number) => (
            <React.Fragment key={i}>
              <tr className="border-b border-slate-100">
                <td className="py-3 text-slate-700 font-medium">
                  {item.name}
                  {item.taxMode === 'inclusive' && (
                    <div className="text-xs text-blue-600 font-normal italic mt-1">
                      Price is GST Inclusive
                    </div>
                  )}
                </td>
                <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                <td className="py-3 text-right text-slate-600">
                  ₹{item.price.toLocaleString('en-IN')}
                  {item.taxMode === 'inclusive' && item.basePrice && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Base: ₹{item.basePrice.toFixed(2)}
                    </div>
                  )}
                </td>
                <td className="py-3 text-right font-semibold text-slate-700">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">₹{data.subtotal.toLocaleString('en-IN')}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Discount</span>
              <span className="font-medium text-red-500">-₹{data.discount.toLocaleString('en-IN')}</span>
            </div>
          )}
          {(() => {
            const totalCGST = data.items.reduce((sum: number, item: any) => sum + (item.cgstAmount || 0), 0)
            const totalSGST = data.items.reduce((sum: number, item: any) => sum + (item.sgstAmount || 0), 0)
            const totalIGST = data.items.reduce((sum: number, item: any) => sum + (item.igstAmount || 0), 0)

            return (
              <>
                {totalCGST > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">CGST</span>
                    <span className="font-medium">₹{totalCGST.toFixed(2)}</span>
                  </div>
                )}
                {totalSGST > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">SGST</span>
                    <span className="font-medium">₹{totalSGST.toFixed(2)}</span>
                  </div>
                )}
                {totalIGST > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">IGST</span>
                    <span className="font-medium">₹{totalIGST.toFixed(2)}</span>
                  </div>
                )}
                {(totalCGST === 0 && totalSGST === 0 && totalIGST === 0) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Tax</span>
                    <span className="font-medium">₹{data.tax.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </>
            )
          })()}
          <div className="flex justify-between pt-3 border-t-2" style={{ borderColor: color.primary }}>
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-xl" style={{ color: color.primary }}>₹{data.total.toLocaleString('en-IN')}</span>
          </div>
          {data.received > 0 && (
            <>
              {/* Payment Received Section */}
              <div className="mt-3 pt-3 border-t border-dashed border-slate-300">
                <p className="text-xs font-semibold text-slate-500 mb-2">PAYMENT RECEIVED</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    ₹{data.received.toLocaleString('en-IN')} via {' '}
                    <span className="font-medium capitalize">
                      {data.payment?.mode || 'Cash'}
                    </span>
                    {data.payment?.bankName && (
                      <span className="text-slate-500"> – {data.payment.bankName}</span>
                    )}
                    {data.payment?.bankAccount && (
                      <span className="text-slate-400"> (A/c {data.payment.bankAccount})</span>
                    )}
                  </span>
                  <span className="font-medium text-emerald-600">✓ Paid</span>
                </div>
                {data.payment?.reference && (
                  <p className="text-xs text-slate-400 mt-1">Ref: {data.payment.reference}</p>
                )}
              </div>
              {/* Balance Due */}
              {data.balance > 0 && (
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-semibold">Balance Due</span>
                  <span className="font-bold text-red-500">₹{data.balance.toLocaleString('en-IN')}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-xs">Thank you for your business!</p>
      </div>
    </div>
  )
}

// Classic Template
function ClassicTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px]">
      {/* Header with colored band */}
      <div className="p-6 text-white" style={{ backgroundColor: color.primary }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{data.companyName || 'Your Company'}</h1>
            <p className="text-white/80 text-sm">{data.companyPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Invoice</p>
            <p className="text-xl font-bold">#{data.invoiceNumber}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Customer & Date */}
        <div className="flex justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Billed To</p>
            <p className="font-semibold text-lg">{data.customerName}</p>
            {data.customerPhone && <p className="text-slate-500">{data.customerPhone}</p>}
            {data.customerVehicleNo && <p className="text-slate-500">Vehicle: {data.customerVehicleNo}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Date</p>
            <p className="font-medium">{data.invoiceDate}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-6">
          <thead>
            <tr style={{ backgroundColor: color.secondary }}>
              <th className="text-left p-3 text-sm font-semibold" style={{ color: color.primary }}>#</th>
              <th className="text-left p-3 text-sm font-semibold" style={{ color: color.primary }}>Description</th>
              <th className="text-center p-3 text-sm font-semibold" style={{ color: color.primary }}>Qty</th>
              <th className="text-right p-3 text-sm font-semibold" style={{ color: color.primary }}>Rate</th>
              <th className="text-right p-3 text-sm font-semibold" style={{ color: color.primary }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-3 text-slate-500">{i + 1}</td>
                <td className="p-3 font-medium">{item.name}</td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-semibold">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Subtotal</span>
              <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Tax</span>
              <span>₹{data.tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-3 text-white font-bold" style={{ backgroundColor: color.primary }}>
              <span className="px-3">Total</span>
              <span className="px-3">₹{data.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-slate-400 text-sm">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  )
}

// Bold Template
function BoldTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] bg-slate-900 text-white">
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h2 className="text-4xl font-black tracking-tight" style={{ color: color.primary }}>INVOICE</h2>
            <p className="text-slate-400 mt-1">#{data.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold">{data.companyName || 'Company'}</h1>
            <p className="text-slate-400">{data.companyPhone}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: color.primary }}>Bill To</p>
          <p className="text-2xl font-bold">{data.customerName}</p>
          <p className="text-slate-400">{data.customerPhone}</p>
          {data.customerVehicleNo && <p className="text-slate-400">Vehicle: {data.customerVehicleNo}</p>}
          <p className="text-slate-500 text-sm mt-2">Date: {data.invoiceDate}</p>
        </div>

        {/* Items */}
        <div className="mb-8">
          {data.items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-slate-700">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-slate-400 text-sm">{item.quantity} × ₹{item.price.toLocaleString('en-IN')}</p>
              </div>
              <p className="text-xl font-bold" style={{ color: color.primary }}>₹{item.total.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="p-6 rounded-xl" style={{ backgroundColor: color.primary }}>
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium">Total Amount</span>
            <span className="text-4xl font-black">₹{data.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Elegant Template
function ElegantTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] p-10 border-8" style={{ borderColor: color.secondary }}>
      {/* Header */}
      <div className="text-center mb-10 pb-6 border-b-2" style={{ borderColor: color.primary }}>
        <h1 className="text-3xl font-serif font-bold tracking-wide" style={{ color: color.primary }}>
          {data.companyName || 'Your Company'}
        </h1>
        <p className="text-slate-500 mt-1">{data.companyPhone}</p>
      </div>

      {/* Invoice Title */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-serif tracking-[0.3em] text-slate-400">INVOICE</h2>
        <p className="font-serif text-lg mt-2" style={{ color: color.primary }}>#{data.invoiceNumber}</p>
      </div>

      {/* Details */}
      <div className="flex justify-between mb-10">
        <div>
          <p className="text-xs tracking-widest text-slate-400 mb-2">BILL TO</p>
          <p className="font-serif text-lg">{data.customerName}</p>
          <p className="text-slate-500">{data.customerPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-xs tracking-widest text-slate-400 mb-2">DATE</p>
          <p className="font-serif">{data.invoiceDate}</p>
        </div>
      </div>

      {/* Items */}
      <table className="w-full mb-10">
        <thead>
          <tr className="border-y" style={{ borderColor: color.primary }}>
            <th className="py-3 text-left text-xs tracking-widest text-slate-400">ITEM</th>
            <th className="py-3 text-center text-xs tracking-widest text-slate-400">QTY</th>
            <th className="py-3 text-right text-xs tracking-widest text-slate-400">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item: any, i: number) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-4 font-serif">{item.name}</td>
              <td className="py-4 text-center text-slate-500">{item.quantity}</td>
              <td className="py-4 text-right font-serif">₹{item.total.toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="text-right">
        <div className="inline-block text-left">
          <div className="flex justify-between gap-12 mb-2">
            <span className="text-slate-400">Subtotal</span>
            <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between gap-12 mb-2">
            <span className="text-slate-400">Tax</span>
            <span>₹{data.tax.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between gap-12 pt-3 border-t-2" style={{ borderColor: color.primary }}>
            <span className="font-serif text-lg">Total</span>
            <span className="font-serif text-2xl" style={{ color: color.primary }}>₹{data.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-slate-400 font-serif italic">Thank you for your patronage</p>
      </div>
    </div>
  )
}

// Minimal Template
function MinimalTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] p-8">
      {/* Simple Header */}
      <div className="mb-12">
        <p className="text-slate-400 text-sm">Invoice #{data.invoiceNumber}</p>
        <p className="text-slate-400 text-sm">{data.invoiceDate}</p>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-2 gap-8 mb-12">
        <div>
          <p className="text-xs text-slate-400 mb-1">From</p>
          <p className="font-semibold">{data.companyName || 'Your Company'}</p>
          <p className="text-slate-500 text-sm">{data.companyPhone}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">To</p>
          <p className="font-semibold">{data.customerName}</p>
          <p className="text-slate-500 text-sm">{data.customerPhone}</p>
        </div>
      </div>

      {/* Items */}
      <div className="mb-12">
        {data.items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between py-3 border-b border-slate-100">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-slate-400 text-sm">{item.quantity} × ₹{item.price}</p>
            </div>
            <p className="font-semibold">₹{item.total.toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-slate-400 text-sm">Total</p>
        </div>
        <p className="text-4xl font-bold" style={{ color: color.primary }}>₹{data.total.toLocaleString('en-IN')}</p>
      </div>
    </div>
  )
}

// Corporate Template
function CorporateTemplate({ data, color, documentType = 'invoice' }: { data: any; color: any; documentType?: 'invoice' | 'quotation' }) {
  return (
    <div className="w-[600px]">
      {/* Header */}
      <div className="p-6 flex justify-between items-center" style={{ backgroundColor: color.secondary }}>
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: color.primary }}
          >
            {(data.companyName || 'C')[0]}
          </div>
          <div>
            <h1 className="font-bold text-lg">{data.companyName || 'Company Name'}</h1>
            <p className="text-sm text-slate-500">{data.companyPhone}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg" style={{ color: color.primary }}>{documentType === 'quotation' ? 'QUOTATION' : 'TAX INVOICE'}</p>
          <p className="text-sm text-slate-500">{data.invoiceNumber}</p>
        </div>
      </div>

      <div className="p-6">
        {/* Customer & Invoice Info */}
        <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-1">BILL TO</p>
            <p className="font-semibold">{data.customerName}</p>
            <p className="text-sm text-slate-500">{data.customerPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-400 mb-1">INVOICE DATE</p>
            <p className="font-semibold">{data.invoiceDate}</p>
          </div>
        </div>

        {/* Items */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2" style={{ borderColor: color.primary }}>
              <th className="pb-3 text-left text-xs font-bold text-slate-500">ITEM</th>
              <th className="pb-3 text-center text-xs font-bold text-slate-500">QTY</th>
              <th className="pb-3 text-right text-xs font-bold text-slate-500">RATE</th>
              <th className="pb-3 text-right text-xs font-bold text-slate-500">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-3">{item.name}</td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                <td className="py-3 text-right font-semibold">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Subtotal</span>
              <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Tax</span>
              <span>₹{data.tax.toLocaleString('en-IN')}</span>
            </div>
            <div
              className="flex justify-between py-3 px-4 rounded-lg mt-2 text-white font-bold"
              style={{ backgroundColor: color.primary }}
            >
              <span>TOTAL</span>
              <span>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
            {data.balance > 0 && (
              <div className="flex justify-between py-2 mt-2 text-sm">
                <span className="text-slate-500">Balance Due</span>
                <span className="text-red-500 font-semibold">₹{data.balance.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-center text-slate-400 text-sm">
          Thank you for your business!
        </div>
      </div>
    </div>
  )
}

// Gradient Template
function GradientTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px]">
      {/* Gradient Header */}
      <div
        className="p-8 text-white"
        style={{ background: `linear-gradient(135deg, ${color.primary} 0%, ${color.primary}dd 50%, ${color.primary}99 100%)` }}
      >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{data.companyName || 'Your Company'}</h1>
            <p className="text-white/70 mt-1">{data.companyPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-sm uppercase tracking-wider">Invoice</p>
            <p className="text-2xl font-bold mt-1">#{data.invoiceNumber}</p>
            <p className="text-white/70 text-sm mt-2">{data.invoiceDate}</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Customer */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: color.primary }}>Billed To</p>
          <p className="text-xl font-semibold">{data.customerName}</p>
          <p className="text-slate-500">{data.customerPhone}</p>
        </div>

        {/* Items */}
        <div className="mb-8">
          {data.items.map((item: any, i: number) => (
            <div
              key={i}
              className="flex justify-between items-center py-4 border-b border-slate-100"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: `linear-gradient(135deg, ${color.primary}, ${color.primary}99)` }}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-slate-400 text-sm">{item.quantity} × ₹{item.price.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <p className="font-semibold text-lg">₹{item.total.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div
          className="p-6 rounded-2xl text-white"
          style={{ background: `linear-gradient(135deg, ${color.primary}, ${color.primary}99)` }}
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white/70 text-sm">Total Amount</p>
              <p className="text-3xl font-bold">₹{data.total.toLocaleString('en-IN')}</p>
            </div>
            {data.balance > 0 && (
              <div className="text-right">
                <p className="text-white/70 text-sm">Balance Due</p>
                <p className="text-xl font-semibold">₹{data.balance.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Striped Template
function StripedTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 pb-6 border-b-4" style={{ borderColor: color.primary }}>
        <div>
          <h1 className="text-2xl font-bold">{data.companyName || 'Your Company'}</h1>
          <p className="text-slate-500">{data.companyPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Invoice No.</p>
          <p className="text-xl font-bold" style={{ color: color.primary }}>{data.invoiceNumber}</p>
        </div>
      </div>

      {/* Info Row */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="p-4 rounded-lg" style={{ backgroundColor: color.secondary }}>
          <p className="text-xs text-slate-500 mb-1">Bill To</p>
          <p className="font-semibold">{data.customerName}</p>
          <p className="text-sm text-slate-500">{data.customerPhone}</p>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 text-right">
          <p className="text-xs text-slate-500 mb-1">Date</p>
          <p className="font-semibold">{data.invoiceDate}</p>
        </div>
      </div>

      {/* Items with alternating stripes */}
      <table className="w-full mb-8">
        <thead>
          <tr style={{ backgroundColor: color.primary }} className="text-white">
            <th className="p-3 text-left text-sm">Item</th>
            <th className="p-3 text-center text-sm">Qty</th>
            <th className="p-3 text-right text-sm">Rate</th>
            <th className="p-3 text-right text-sm">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item: any, i: number) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? color.secondary : 'white' }}>
              <td className="p-3 font-medium">{item.name}</td>
              <td className="p-3 text-center">{item.quantity}</td>
              <td className="p-3 text-right">₹{item.price.toLocaleString('en-IN')}</td>
              <td className="p-3 text-right font-semibold">₹{item.total.toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Subtotal</span>
            <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Tax</span>
            <span>₹{data.tax.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-3 text-white font-bold rounded-lg px-3" style={{ backgroundColor: color.primary }}>
            <span>Total</span>
            <span>₹{data.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact Template - Fits A5 paper size (420px width)
function CompactTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-full p-3" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b-2" style={{ borderColor: color.primary }}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: color.primary }}
          >
            {(data.companyName || 'C')[0]}
          </div>
          <div>
            <h1 className="font-bold text-sm">{data.companyName || 'Company'}</h1>
            <p className="text-[10px] text-slate-400">{data.companyPhone}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-sm" style={{ color: color.primary }}>#{data.invoiceNumber}</p>
          <p className="text-[10px] text-slate-400">{data.invoiceDate}</p>
        </div>
      </div>

      {/* Customer - inline */}
      <div className="flex items-center gap-1 mb-3 text-xs flex-wrap">
        <span className="text-slate-400">To:</span>
        <span className="font-medium">{data.customerName}</span>
        {data.customerPhone && <span className="text-slate-400">• {data.customerPhone}</span>}
      </div>

      {/* Compact Items Table */}
      <div className="mb-3 bg-slate-50 rounded-lg p-2 overflow-hidden">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-1 font-semibold">Item</th>
              <th className="text-center py-1 font-semibold w-12">Qty</th>
              <th className="text-right py-1 font-semibold w-16">Rate</th>
              <th className="text-right py-1 font-semibold w-16">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 font-medium truncate max-w-[120px]">{item.name}</td>
                <td className="py-1.5 text-center text-slate-600">{item.quantity}</td>
                <td className="py-1.5 text-right text-slate-600">₹{(item.price || 0).toLocaleString('en-IN')}</td>
                <td className="py-1.5 text-right font-semibold">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compact Totals */}
      <div className="p-2 rounded-lg text-[11px]" style={{ backgroundColor: color.secondary }}>
        <div className="flex justify-between mb-1">
          <span className="text-slate-500">Subtotal:</span>
          <span className="text-slate-700">₹{data.subtotal.toLocaleString('en-IN')}</span>
        </div>
        {data.discount > 0 && (
          <div className="flex justify-between mb-1">
            <span className="text-slate-500">Discount:</span>
            <span className="text-red-600">-₹{((data.subtotal * data.discount) / 100).toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="flex justify-between mb-1">
          <span className="text-slate-500">Tax:</span>
          <span className="text-slate-700">₹{data.tax.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-slate-300 mt-1">
          <span className="font-bold">Total:</span>
          <span className="font-bold text-base" style={{ color: color.primary }}>
            ₹{data.total.toLocaleString('en-IN')}
          </span>
        </div>
        {data.received > 0 && (
          <>
            <div className="flex justify-between mt-1">
              <span className="text-slate-500">Received:</span>
              <span className="text-green-600">₹{data.received.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Balance:</span>
              <span className="text-orange-600 font-semibold">₹{data.balance.toLocaleString('en-IN')}</span>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-slate-200 text-center">
        <p className="text-[9px] text-slate-400">Thank you for your business!</p>
      </div>
    </div>
  )
}

// Premium Template
function PremiumTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Gold accent line */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${color.primary}, ${color.primary}66, ${color.primary})` }} />

      <div className="p-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: color.primary }}
              >
                {(data.companyName || 'C')[0]}
              </div>
              <h1 className="text-2xl font-bold text-white">{data.companyName || 'Your Company'}</h1>
            </div>
            <p className="text-slate-400 text-sm ml-15">{data.companyPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-[0.3em] mb-2" style={{ color: color.primary }}>INVOICE</p>
            <p className="text-3xl font-bold text-white">#{data.invoiceNumber}</p>
            <p className="text-slate-400 text-sm mt-2">{data.invoiceDate}</p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-10 p-6 rounded-xl border" style={{ borderColor: color.primary + '40' }}>
          <p className="text-xs tracking-widest mb-2" style={{ color: color.primary }}>BILLED TO</p>
          <p className="text-xl font-semibold text-white">{data.customerName}</p>
          <p className="text-slate-400">{data.customerPhone}</p>
        </div>

        {/* Items */}
        <div className="mb-10">
          <div className="grid grid-cols-4 pb-3 border-b" style={{ borderColor: color.primary + '40' }}>
            <span className="text-xs tracking-wider text-slate-400">ITEM</span>
            <span className="text-xs tracking-wider text-slate-400 text-center">QTY</span>
            <span className="text-xs tracking-wider text-slate-400 text-right">RATE</span>
            <span className="text-xs tracking-wider text-slate-400 text-right">AMOUNT</span>
          </div>
          {data.items.map((item: any, i: number) => (
            <div key={i} className="grid grid-cols-4 py-4 border-b border-slate-700">
              <span className="text-white font-medium">{item.name}</span>
              <span className="text-slate-400 text-center">{item.quantity}</span>
              <span className="text-slate-400 text-right">₹{item.price.toLocaleString('en-IN')}</span>
              <span className="text-white font-semibold text-right">₹{item.total.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-2 text-slate-400">
              <span>Subtotal</span>
              <span className="text-white">₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-400">
              <span>Tax</span>
              <span className="text-white">₹{data.tax.toLocaleString('en-IN')}</span>
            </div>
            <div
              className="flex justify-between py-4 px-4 rounded-xl mt-3"
              style={{ backgroundColor: color.primary }}
            >
              <span className="font-semibold text-white">TOTAL</span>
              <span className="text-2xl font-bold text-white">₹{data.total.toLocaleString('en-IN')}</span>
            </div>
            {data.balance > 0 && (
              <div className="flex justify-between py-2 mt-2">
                <span className="text-slate-400">Balance Due</span>
                <span className="text-red-400 font-semibold">₹{data.balance.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-700 text-center">
          <p className="text-slate-500 text-sm">Thank you for your valued business</p>
        </div>
      </div>
    </div>
  )
}

// Invoice Template - Clean professional
function InvoiceTemplate({ data, color, documentType = 'invoice' }: { data: any; color: any; documentType?: 'invoice' | 'quotation' }) {
  return (
    <div className="w-[600px]">
      {/* Header with side accent */}
      <div className="flex">
        <div className="w-2" style={{ backgroundColor: color.primary }} />
        <div className="flex-1 p-6 flex justify-between items-start" style={{ backgroundColor: color.secondary }}>
          <div>
            <h1 className="text-xl font-bold" style={{ color: color.primary }}>{data.companyName || 'Your Company'}</h1>
            <p className="text-slate-500 text-sm">{data.companyPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: color.primary }}>{documentType === 'quotation' ? 'QUOTATION' : 'TAX INVOICE'}</p>
            <p className="text-slate-600 text-sm">{data.invoiceNumber}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Details Row */}
        <div className="flex justify-between mb-6 text-sm">
          <div>
            <p className="font-semibold" style={{ color: color.primary }}>Bill To:</p>
            <p className="font-medium">{data.customerName}</p>
            <p className="text-slate-500">{data.customerPhone}</p>
          </div>
          <div className="text-right">
            <p><span className="text-slate-500">Date:</span> {data.invoiceDate}</p>
          </div>
        </div>

        {/* Items */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="text-white" style={{ backgroundColor: color.primary }}>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-2">{item.name}</td>
                <td className="p-2 text-center">{item.quantity}</td>
                <td className="p-2 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                <td className="p-2 text-right font-medium">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-56 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Subtotal</span>
              <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Tax</span>
              <span>₹{data.tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 mt-1 font-bold text-white px-2" style={{ backgroundColor: color.primary }}>
              <span>Total</span>
              <span>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center text-slate-400 text-xs">
          Thank you for your business!
        </div>
      </div>
    </div>
  )
}

// Receipt Template - Compact thermal style
function ReceiptTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[320px] p-4 bg-white font-mono text-sm">
      {/* Header */}
      <div className="text-center border-b-2 border-dashed border-slate-300 pb-3 mb-3">
        <h1 className="font-bold text-lg" style={{ color: color.primary }}>{data.companyName || 'STORE NAME'}</h1>
        <p className="text-slate-500 text-xs">{data.companyPhone}</p>
        <p className="text-xs text-slate-400 mt-1">--- RECEIPT ---</p>
      </div>

      {/* Invoice Info */}
      <div className="text-xs mb-3 space-y-0.5">
        <div className="flex justify-between">
          <span>Receipt No:</span>
          <span>{data.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{data.invoiceDate}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer:</span>
          <span>{data.customerName}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-slate-300 pt-2 mb-2" />

      {/* Items */}
      <div className="space-y-1 mb-3">
        {data.items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="flex-1 truncate">{item.name} x{item.quantity}</span>
            <span className="ml-2">₹{item.total.toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-slate-300 pt-2" />

      {/* Totals */}
      <div className="text-xs space-y-1 mt-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span>₹{data.tax.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-1" style={{ color: color.primary }}>
          <span>TOTAL</span>
          <span>₹{data.total.toLocaleString('en-IN')}</span>
        </div>
        {data.received > 0 && (
          <>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>₹{data.received.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span>Balance</span>
              <span>₹{data.balance.toLocaleString('en-IN')}</span>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-dashed border-slate-300 mt-3 pt-3 text-center">
        <p className="text-xs text-slate-400">Thank you! Visit Again</p>
        <p className="text-[10px] text-slate-300 mt-1">********************************</p>
      </div>
    </div>
  )
}

// Zoho Style Template
function ZohoTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] bg-white">
      {/* Top colored bar */}
      <div className="h-2" style={{ backgroundColor: color.primary }} />

      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{data.companyName || 'Your Business'}</h1>
            <p className="text-slate-500 text-sm">{data.companyPhone}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-light tracking-wide" style={{ color: color.primary }}>INVOICE</h2>
            <p className="text-slate-600 text-sm mt-1"># {data.invoiceNumber}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6 py-4 border-y border-slate-200">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">Bill To</p>
            <p className="font-medium mt-1">{data.customerName}</p>
            <p className="text-slate-500 text-sm">{data.customerPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Invoice Date</p>
            <p className="font-medium mt-1">{data.invoiceDate}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="bg-slate-50">
              <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
              <th className="p-3 text-left text-xs font-semibold text-slate-600 uppercase">Item & Description</th>
              <th className="p-3 text-center text-xs font-semibold text-slate-600 uppercase">Qty</th>
              <th className="p-3 text-right text-xs font-semibold text-slate-600 uppercase">Rate</th>
              <th className="p-3 text-right text-xs font-semibold text-slate-600 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-3 text-slate-400">{i + 1}</td>
                <td className="p-3 font-medium">{item.name}</td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-medium">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-slate-500">Sub Total</span>
              <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 text-sm border-b border-slate-200">
              <span className="text-slate-500">Tax</span>
              <span>₹{data.tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-3 font-bold text-lg">
              <span>Total</span>
              <span style={{ color: color.primary }}>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center text-slate-400 text-xs">
          Thank you for your business!
        </div>
      </div>
    </div>
  )
}

// Tally Style Template
function TallyTemplate({ data, color, documentType = 'invoice' }: { data: any; color: any; documentType?: 'invoice' | 'quotation' }) {
  return (
    <div className="w-[600px] p-1 border-2" style={{ borderColor: color.primary }}>
      <div className="border" style={{ borderColor: color.primary }}>
        {/* Header */}
        <div className="text-center py-3 border-b" style={{ borderColor: color.primary, backgroundColor: color.secondary }}>
          <h1 className="text-xl font-bold" style={{ color: color.primary }}>{data.companyName || 'COMPANY NAME'}</h1>
          <p className="text-sm text-slate-600">{data.companyPhone}</p>
        </div>

        <div className="text-center py-2 border-b font-bold text-lg" style={{ borderColor: color.primary }}>
          {documentType === 'quotation' ? 'QUOTATION' : 'TAX INVOICE'}
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 text-sm border-b" style={{ borderColor: color.primary }}>
          <div className="p-2 border-r" style={{ borderColor: color.primary }}>
            <span className="font-semibold">Invoice No:</span> {data.invoiceNumber}
          </div>
          <div className="p-2">
            <span className="font-semibold">Date:</span> {data.invoiceDate}
          </div>
        </div>

        {/* Customer */}
        <div className="p-2 border-b text-sm" style={{ borderColor: color.primary }}>
          <span className="font-semibold">Party Name:</span> {data.customerName}
          {data.customerPhone && <span className="ml-4">Ph: {data.customerPhone}</span>}
          {data.customerVehicleNo && <span className="ml-4">Vehicle: {data.customerVehicleNo}</span>}
        </div>

        {/* Items Table */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: color.primary, backgroundColor: color.secondary }}>
              <th className="p-2 text-left border-r" style={{ borderColor: color.primary }}>S.No</th>
              <th className="p-2 text-left border-r" style={{ borderColor: color.primary }}>Particulars</th>
              <th className="p-2 text-center border-r" style={{ borderColor: color.primary }}>Qty</th>
              <th className="p-2 text-right border-r" style={{ borderColor: color.primary }}>Rate</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b" style={{ borderColor: color.primary }}>
                <td className="p-2 border-r" style={{ borderColor: color.primary }}>{i + 1}</td>
                <td className="p-2 border-r" style={{ borderColor: color.primary }}>{item.name}</td>
                <td className="p-2 text-center border-r" style={{ borderColor: color.primary }}>{item.quantity}</td>
                <td className="p-2 text-right border-r" style={{ borderColor: color.primary }}>₹{item.price.toLocaleString('en-IN')}</td>
                <td className="p-2 text-right">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t" style={{ borderColor: color.primary }}>
          <div className="flex justify-between p-2 text-sm border-b" style={{ borderColor: color.primary }}>
            <span>Subtotal</span>
            <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between p-2 text-sm border-b" style={{ borderColor: color.primary }}>
            <span>Tax</span>
            <span>₹{data.tax.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between p-2 font-bold" style={{ backgroundColor: color.secondary }}>
            <span>Grand Total</span>
            <span style={{ color: color.primary }}>₹{data.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// GST Professional Template
function GSTTemplate({ data, color, documentType = 'invoice' }: { data: any; color: any; documentType?: 'invoice' | 'quotation' }) {
  return (
    <div className="w-[600px] bg-white border border-slate-300">
      {/* Header */}
      <div className="p-4 border-b-2" style={{ borderColor: color.primary }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{data.companyName || 'Business Name'}</h1>
            <p className="text-sm text-slate-500">{data.companyPhone}</p>
            <p className="text-xs text-slate-400 mt-1">GSTIN: 29XXXXX1234X1Z5</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold px-3 py-1 rounded" style={{ backgroundColor: color.secondary, color: color.primary }}>
              {documentType === 'quotation' ? 'QUOTATION' : 'TAX INVOICE'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Invoice & Customer Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="border rounded p-3">
            <p className="font-semibold mb-2" style={{ color: color.primary }}>Bill To:</p>
            <p className="font-medium">{data.customerName}</p>
            <p className="text-slate-500">{data.customerPhone}</p>
          </div>
          <div className="border rounded p-3">
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">Invoice No:</span>
              <span className="font-medium">{data.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span className="font-medium">{data.invoiceDate}</span>
            </div>
          </div>
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr style={{ backgroundColor: color.primary }} className="text-white">
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-center">HSN</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-center">GST%</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b">
                <td className="p-2">{item.name}</td>
                <td className="p-2 text-center text-slate-400">-</td>
                <td className="p-2 text-center">{item.quantity}</td>
                <td className="p-2 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                <td className="p-2 text-center">{item.gst || 18}%</td>
                <td className="p-2 text-right font-medium">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tax Breakdown & Total */}
        <div className="flex justify-end">
          <div className="w-72 text-sm">
            <div className="flex justify-between py-1 border-b">
              <span>Taxable Amount</span>
              <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span>CGST</span>
              <span>₹{(data.tax / 2).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1 border-b">
              <span>SGST</span>
              <span>₹{(data.tax / 2).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 font-bold text-lg" style={{ backgroundColor: color.secondary }}>
              <span className="px-2">Total</span>
              <span className="px-2" style={{ color: color.primary }}>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple Clean Template
function SimpleTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[550px] p-8 bg-white">
      {/* Simple Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-light text-slate-800">{data.companyName || 'Company'}</h1>
        <div className="w-12 h-1 mt-2" style={{ backgroundColor: color.primary }} />
      </div>

      {/* Invoice Details */}
      <div className="flex justify-between mb-8 text-sm">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Billed To</p>
          <p className="font-medium">{data.customerName}</p>
          <p className="text-slate-500">{data.customerPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Invoice</p>
          <p className="font-medium">{data.invoiceNumber}</p>
          <p className="text-slate-500">{data.invoiceDate}</p>
        </div>
      </div>

      {/* Items */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-400 uppercase tracking-wide pb-2 border-b">
          <span>Description</span>
          <span>Amount</span>
        </div>
        {data.items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between py-3 border-b border-slate-100">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-slate-400">{item.quantity} × ₹{item.price.toLocaleString('en-IN')}</p>
            </div>
            <p className="font-medium">₹{item.total.toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="flex justify-end">
        <div className="w-48">
          <div className="flex justify-between py-2 text-sm text-slate-500">
            <span>Subtotal</span>
            <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-2 text-sm text-slate-500 border-b">
            <span>Tax</span>
            <span>₹{data.tax.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-3 text-lg font-medium">
            <span>Total</span>
            <span style={{ color: color.primary }}>₹{data.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Bordered Decorative Template
function BorderedTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] p-3" style={{ backgroundColor: color.secondary }}>
      <div className="border-2 p-6 bg-white" style={{ borderColor: color.primary }}>
        {/* Decorative corners */}
        <div className="relative">
          <div className="absolute -top-3 -left-3 w-6 h-6 border-t-4 border-l-4" style={{ borderColor: color.primary }} />
          <div className="absolute -top-3 -right-3 w-6 h-6 border-t-4 border-r-4" style={{ borderColor: color.primary }} />
          <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-4 border-l-4" style={{ borderColor: color.primary }} />
          <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-4 border-r-4" style={{ borderColor: color.primary }} />

          {/* Content */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold" style={{ color: color.primary }}>{data.companyName || 'Business Name'}</h1>
            <p className="text-slate-500 text-sm">{data.companyPhone}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-px w-12" style={{ backgroundColor: color.primary }} />
              <span className="text-sm font-medium" style={{ color: color.primary }}>INVOICE</span>
              <div className="h-px w-12" style={{ backgroundColor: color.primary }} />
            </div>
          </div>

          {/* Details */}
          <div className="flex justify-between mb-6 text-sm">
            <div>
              <p className="font-semibold" style={{ color: color.primary }}>To:</p>
              <p>{data.customerName}</p>
              <p className="text-slate-500">{data.customerPhone}</p>
            </div>
            <div className="text-right">
              <p><span className="text-slate-500">No:</span> {data.invoiceNumber}</p>
              <p><span className="text-slate-500">Date:</span> {data.invoiceDate}</p>
            </div>
          </div>

          {/* Items */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-y-2" style={{ borderColor: color.primary }}>
                <th className="py-2 text-left">Item</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item: any, i: number) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                  <td className="py-2 text-right">₹{item.total.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div className="flex justify-end">
            <div className="w-48 border-2 p-3" style={{ borderColor: color.primary }}>
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>₹{data.tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold mt-2 pt-2 border-t" style={{ borderColor: color.primary, color: color.primary }}>
                <span>Total</span>
                <span>₹{data.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Watermark Template
function WatermarkTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] p-8 bg-white relative overflow-hidden">
      {/* Watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none"
        style={{ fontSize: '180px', fontWeight: 'bold', color: color.primary, transform: 'rotate(-30deg)' }}
      >
        PAID
      </div>

      {/* Header */}
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: color.primary }}>{data.companyName || 'Company'}</h1>
          <p className="text-slate-500 text-sm">{data.companyPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-light tracking-wider" style={{ color: color.primary }}>INVOICE</p>
          <p className="text-slate-500 mt-1">{data.invoiceNumber}</p>
        </div>
      </div>

      {/* Customer & Date */}
      <div className="flex justify-between mb-8 relative z-10">
        <div>
          <p className="text-xs text-slate-400 uppercase">Bill To</p>
          <p className="font-medium mt-1">{data.customerName}</p>
          <p className="text-slate-500 text-sm">{data.customerPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase">Date</p>
          <p className="font-medium mt-1">{data.invoiceDate}</p>
        </div>
      </div>

      {/* Items */}
      <table className="w-full mb-8 relative z-10">
        <thead>
          <tr className="border-b-2" style={{ borderColor: color.primary }}>
            <th className="py-3 text-left text-sm font-semibold">Description</th>
            <th className="py-3 text-center text-sm font-semibold">Qty</th>
            <th className="py-3 text-right text-sm font-semibold">Rate</th>
            <th className="py-3 text-right text-sm font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item: any, i: number) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-3">{item.name}</td>
              <td className="py-3 text-center">{item.quantity}</td>
              <td className="py-3 text-right">₹{item.price.toLocaleString('en-IN')}</td>
              <td className="py-3 text-right font-medium">₹{item.total.toLocaleString('en-IN')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end relative z-10">
        <div className="w-64">
          <div className="flex justify-between py-2 text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <span className="text-slate-500">Tax</span>
            <span>₹{data.tax.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-3 border-t-2 font-bold text-lg" style={{ borderColor: color.primary }}>
            <span>Total</span>
            <span style={{ color: color.primary }}>₹{data.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-slate-400 text-sm relative z-10">
        Thank you for your business!
      </div>
    </div>
  )
}

// Split Header Template
function SplitTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px]">
      {/* Split Header */}
      <div className="flex">
        <div className="flex-1 p-6" style={{ backgroundColor: color.primary }}>
          <h1 className="text-xl font-bold text-white">{data.companyName || 'Company'}</h1>
          <p className="text-white/70 text-sm">{data.companyPhone}</p>
        </div>
        <div className="flex-1 p-6 text-right" style={{ backgroundColor: color.secondary }}>
          <p className="text-lg font-bold" style={{ color: color.primary }}>INVOICE</p>
          <p className="text-sm" style={{ color: color.primary }}>{data.invoiceNumber}</p>
          <p className="text-xs text-slate-500">{data.invoiceDate}</p>
        </div>
      </div>

      <div className="p-6">
        {/* Customer */}
        <div className="mb-6 p-4 border-l-4" style={{ borderColor: color.primary, backgroundColor: color.secondary }}>
          <p className="text-xs text-slate-500 uppercase">Bill To</p>
          <p className="font-semibold">{data.customerName}</p>
          <p className="text-sm text-slate-500">{data.customerPhone}</p>
        </div>

        {/* Items */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b-2" style={{ borderColor: color.primary }}>
              <th className="py-2 text-left">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Rate</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                <td className="py-2 text-right font-medium">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div className="flex">
          <div className="flex-1" />
          <div className="w-48">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-slate-500">Tax</span>
              <span>₹{data.tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 mt-1 font-bold text-white px-3 rounded" style={{ backgroundColor: color.primary }}>
              <span>Total</span>
              <span>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Corner Accent Template
function CornerTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] p-8 bg-white relative">
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-20 h-20" style={{ background: `linear-gradient(135deg, ${color.primary} 50%, transparent 50%)` }} />
      <div className="absolute bottom-0 right-0 w-20 h-20" style={{ background: `linear-gradient(-45deg, ${color.primary} 50%, transparent 50%)` }} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 ml-12">
          <div>
            <h1 className="text-2xl font-bold">{data.companyName || 'Company'}</h1>
            <p className="text-slate-500 text-sm">{data.companyPhone}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-light" style={{ color: color.primary }}>INVOICE</p>
            <p className="text-slate-500">{data.invoiceNumber}</p>
            <p className="text-slate-400 text-sm">{data.invoiceDate}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Bill To</p>
          <p className="font-semibold mt-1">{data.customerName}</p>
          <p className="text-slate-500 text-sm">{data.customerPhone}</p>
        </div>

        {/* Items */}
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr style={{ backgroundColor: color.secondary }}>
              <th className="p-3 text-left" style={{ color: color.primary }}>Description</th>
              <th className="p-3 text-center" style={{ color: color.primary }}>Qty</th>
              <th className="p-3 text-right" style={{ color: color.primary }}>Rate</th>
              <th className="p-3 text-right" style={{ color: color.primary }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-3">{item.name}</td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                <td className="p-3 text-right font-medium">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mr-12">
          <div className="w-56">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-slate-500">Tax</span>
              <span>₹{data.tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 font-bold text-lg" style={{ borderColor: color.primary }}>
              <span>Total</span>
              <span style={{ color: color.primary }}>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Dotted Border Template
function DottedTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] p-6">
      <div className="border-2 border-dashed p-6" style={{ borderColor: color.primary }}>
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b-2 border-dashed" style={{ borderColor: color.primary }}>
          <h1 className="text-2xl font-bold" style={{ color: color.primary }}>{data.companyName || 'Company Name'}</h1>
          <p className="text-slate-500 text-sm">{data.companyPhone}</p>
          <p className="mt-2 inline-block px-4 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: color.secondary, color: color.primary }}>
            INVOICE #{data.invoiceNumber}
          </p>
        </div>

        {/* Details */}
        <div className="flex justify-between mb-6 text-sm">
          <div>
            <p className="font-semibold" style={{ color: color.primary }}>Bill To:</p>
            <p>{data.customerName}</p>
            <p className="text-slate-500">{data.customerPhone}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold" style={{ color: color.primary }}>Date:</p>
            <p>{data.invoiceDate}</p>
          </div>
        </div>

        {/* Items */}
        <div className="mb-6">
          <div className="grid grid-cols-4 py-2 border-b-2 border-dashed text-xs font-semibold" style={{ borderColor: color.primary, color: color.primary }}>
            <span>Item</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
          </div>
          {data.items.map((item: any, i: number) => (
            <div key={i} className="grid grid-cols-4 py-3 border-b border-dotted border-slate-300 text-sm">
              <span>{item.name}</span>
              <span className="text-center">{item.quantity}</span>
              <span className="text-right">₹{item.price.toLocaleString('en-IN')}</span>
              <span className="text-right font-medium">₹{item.total.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-48 border-2 border-dashed p-3" style={{ borderColor: color.primary }}>
            <div className="flex justify-between py-1 text-sm">
              <span>Subtotal</span>
              <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span>Tax</span>
              <span>₹{data.tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 mt-1 font-bold border-t-2 border-dashed" style={{ borderColor: color.primary, color: color.primary }}>
              <span>Total</span>
              <span>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t-2 border-dashed text-center text-slate-400 text-xs" style={{ borderColor: color.primary }}>
          Thank you for your business!
        </div>
      </div>
    </div>
  )
}

// Floral Template - Decorative with floral corner elements
function FloralTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] relative overflow-hidden">
      {/* Floral Corner Decorations */}
      <svg className="absolute top-0 left-0 w-32 h-32 opacity-20" viewBox="0 0 100 100">
        <circle cx="10" cy="10" r="8" fill={color.primary} />
        <circle cx="25" cy="5" r="5" fill={color.primary} />
        <circle cx="5" cy="25" r="5" fill={color.primary} />
        <circle cx="20" cy="20" r="6" fill={color.primary} />
        <circle cx="35" cy="15" r="4" fill={color.primary} />
        <circle cx="15" cy="35" r="4" fill={color.primary} />
        <path d="M0,0 Q20,30 0,60 Q30,40 60,60 Q40,30 60,0 Q30,20 0,0" fill={color.secondary} opacity="0.5" />
      </svg>
      <svg className="absolute top-0 right-0 w-32 h-32 opacity-20 transform rotate-90" viewBox="0 0 100 100">
        <circle cx="10" cy="10" r="8" fill={color.primary} />
        <circle cx="25" cy="5" r="5" fill={color.primary} />
        <circle cx="5" cy="25" r="5" fill={color.primary} />
        <circle cx="20" cy="20" r="6" fill={color.primary} />
        <path d="M0,0 Q20,30 0,60 Q30,40 60,60 Q40,30 60,0 Q30,20 0,0" fill={color.secondary} opacity="0.5" />
      </svg>
      <svg className="absolute bottom-0 left-0 w-32 h-32 opacity-20 transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="10" cy="10" r="8" fill={color.primary} />
        <circle cx="25" cy="5" r="5" fill={color.primary} />
        <circle cx="5" cy="25" r="5" fill={color.primary} />
        <path d="M0,0 Q20,30 0,60 Q30,40 60,60 Q40,30 60,0 Q30,20 0,0" fill={color.secondary} opacity="0.5" />
      </svg>
      <svg className="absolute bottom-0 right-0 w-32 h-32 opacity-20 transform rotate-180" viewBox="0 0 100 100">
        <circle cx="10" cy="10" r="8" fill={color.primary} />
        <circle cx="25" cy="5" r="5" fill={color.primary} />
        <circle cx="5" cy="25" r="5" fill={color.primary} />
        <path d="M0,0 Q20,30 0,60 Q30,40 60,60 Q40,30 60,0 Q30,20 0,0" fill={color.secondary} opacity="0.5" />
      </svg>

      <div className="p-10 relative z-10">
        {/* Header with decorative border */}
        <div className="text-center mb-8 pb-6" style={{ borderBottom: `2px solid ${color.secondary}` }}>
          <h1 className="text-3xl font-serif font-bold" style={{ color: color.primary }}>{data.companyName || 'Your Company'}</h1>
          <p className="text-slate-500 mt-1">{data.companyPhone}</p>
          <div className="mt-4 inline-flex items-center gap-3 px-6 py-2 rounded-full" style={{ backgroundColor: color.secondary }}>
            <span className="text-sm" style={{ color: color.primary }}>Invoice #{data.invoiceNumber}</span>
            <span className="text-slate-400">•</span>
            <span className="text-sm text-slate-600">{data.invoiceDate}</span>
          </div>
        </div>

        {/* Customer */}
        <div className="mb-8 p-4 rounded-lg border-2" style={{ borderColor: color.secondary, backgroundColor: `${color.secondary}30` }}>
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: color.primary }}>Billed To</p>
          <p className="text-xl font-semibold">{data.customerName}</p>
          <p className="text-slate-500">{data.customerPhone}</p>
        </div>

        {/* Items */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: color.secondary }}>
                <th className="text-left p-3 text-sm font-semibold" style={{ color: color.primary }}>Item</th>
                <th className="text-center p-3 text-sm font-semibold" style={{ color: color.primary }}>Qty</th>
                <th className="text-right p-3 text-sm font-semibold" style={{ color: color.primary }}>Price</th>
                <th className="text-right p-3 text-sm font-semibold" style={{ color: color.primary }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item: any, i: number) => (
                <tr key={i} className="border-b" style={{ borderColor: color.secondary }}>
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 text-center text-slate-600">{item.quantity}</td>
                  <td className="p-3 text-right text-slate-600">₹{item.price.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-semibold">₹{item.total.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex justify-end">
          <div className="w-64 p-4 rounded-lg" style={{ backgroundColor: color.secondary }}>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Tax</span>
              <span className="font-medium">₹{data.tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 mt-2 border-t-2 font-bold text-lg" style={{ borderColor: color.primary, color: color.primary }}>
              <span>Total</span>
              <span>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm italic">✿ Thank you for your business! ✿</p>
        </div>
      </div>
    </div>
  )
}

// Wave Template - With wave decorations at top and bottom
function WaveTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] relative">
      {/* Top Wave */}
      <svg className="w-full h-16" viewBox="0 0 600 60" preserveAspectRatio="none">
        <path d="M0,0 L600,0 L600,30 Q450,60 300,30 Q150,0 0,30 Z" fill={color.primary} />
        <path d="M0,20 Q150,50 300,20 Q450,0 600,20 L600,60 L0,60 Z" fill={color.secondary} opacity="0.5" />
      </svg>

      <div className="px-10 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: color.primary }}>{data.companyName || 'Your Company'}</h1>
            <p className="text-slate-500">{data.companyPhone}</p>
          </div>
          <div className="text-right p-4 rounded-xl" style={{ backgroundColor: color.secondary }}>
            <p className="text-xs uppercase tracking-wider" style={{ color: color.primary }}>Invoice</p>
            <p className="text-xl font-bold" style={{ color: color.primary }}>#{data.invoiceNumber}</p>
            <p className="text-sm text-slate-600">{data.invoiceDate}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="mb-8 p-4 rounded-xl border-l-4" style={{ backgroundColor: color.secondary, borderColor: color.primary }}>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Bill To</p>
          <p className="text-lg font-semibold">{data.customerName}</p>
          <p className="text-slate-500">{data.customerPhone}</p>
        </div>

        {/* Items */}
        <div className="mb-8">
          {data.items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-4 border-b" style={{ borderColor: color.secondary }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: color.primary }}>
                  {i + 1}
                </div>
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-slate-400 text-sm">{item.quantity} × ₹{item.price.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <p className="font-semibold text-lg">₹{item.total.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex justify-end mb-6">
          <div className="w-60">
            <div className="flex justify-between py-2 text-slate-600">
              <span>Subtotal</span>
              <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-2 text-slate-600">
              <span>Tax</span>
              <span>₹{data.tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between py-3 mt-2 rounded-lg px-4 text-white font-bold text-lg" style={{ backgroundColor: color.primary }}>
              <span>Total</span>
              <span>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <svg className="w-full h-16" viewBox="0 0 600 60" preserveAspectRatio="none">
        <path d="M0,30 Q150,0 300,30 Q450,60 600,30 L600,60 L0,60 Z" fill={color.secondary} opacity="0.5" />
        <path d="M0,40 Q150,10 300,40 Q450,70 600,40 L600,60 L0,60 Z" fill={color.primary} />
      </svg>
    </div>
  )
}

// Ribbon Template - With decorative ribbon banners
function RibbonTemplate({ data, color }: { data: any; color: any }) {
  return (
    <div className="w-[600px] p-8 relative">
      {/* Company Ribbon */}
      <div className="relative mb-10">
        <div className="absolute -left-8 -right-8 h-16 flex items-center justify-center text-white" style={{ backgroundColor: color.primary }}>
          <h1 className="text-2xl font-bold">{data.companyName || 'Your Company'}</h1>
        </div>
        <div className="absolute -left-8 top-16 w-0 h-0 border-t-8 border-r-8" style={{ borderTopColor: 'transparent', borderRightColor: `${color.primary}99` }} />
        <div className="absolute -right-8 top-16 w-0 h-0 border-t-8 border-l-8" style={{ borderTopColor: 'transparent', borderLeftColor: `${color.primary}99` }} />
      </div>

      <div className="mt-20">
        {/* Invoice Info */}
        <div className="flex justify-between items-center mb-8">
          <div className="px-4 py-2 rounded-lg" style={{ backgroundColor: color.secondary }}>
            <p className="text-xs text-slate-500">Invoice No.</p>
            <p className="text-lg font-bold" style={{ color: color.primary }}>#{data.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">{data.companyPhone}</p>
            <p className="text-sm text-slate-600">{data.invoiceDate}</p>
          </div>
        </div>

        {/* Customer Ribbon */}
        <div className="relative mb-8">
          <div className="absolute -left-8 right-0 py-4 px-8" style={{ backgroundColor: color.secondary }}>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Billed To</p>
            <p className="font-semibold text-lg">{data.customerName}</p>
            <p className="text-slate-500 text-sm">{data.customerPhone}</p>
          </div>
          <div className="absolute -left-8 top-full w-0 h-0 border-t-6 border-r-6" style={{ borderTopColor: `${color.primary}50`, borderRightColor: 'transparent' }} />
        </div>

        <div className="mt-28">
          {/* Items */}
          <table className="w-full mb-8">
            <thead>
              <tr className="text-white" style={{ backgroundColor: color.primary }}>
                <th className="text-left p-3 rounded-l-lg">#</th>
                <th className="text-left p-3">Item</th>
                <th className="text-center p-3">Qty</th>
                <th className="text-right p-3">Rate</th>
                <th className="text-right p-3 rounded-r-lg">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? '' : ''} style={{ backgroundColor: i % 2 === 0 ? 'white' : color.secondary }}>
                  <td className="p-3 font-medium" style={{ color: color.primary }}>{i + 1}</td>
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 text-center text-slate-600">{item.quantity}</td>
                  <td className="p-3 text-right text-slate-600">₹{item.price.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-semibold">₹{item.total.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Ribbon */}
          <div className="relative">
            <div className="absolute -right-8 left-1/2 py-4 px-8 text-white" style={{ backgroundColor: color.primary }}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-white/70 text-sm">Subtotal: ₹{data.subtotal.toLocaleString('en-IN')} | Tax: ₹{data.tax.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-white/70 text-xs">TOTAL</p>
                  <p className="text-2xl font-bold">₹{data.total.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
            <div className="absolute -right-8 top-full w-0 h-0 border-t-8 border-l-8" style={{ borderTopColor: `${color.primary}99`, borderLeftColor: 'transparent' }} />
          </div>

          {/* Footer */}
          <div className="mt-24 text-center text-slate-400 text-sm">
            Thank you for your business!
          </div>
        </div>
      </div>
    </div>
  )
}

// Tax Invoice Template - Professional GST Format
function TaxInvoiceTemplate({ data, color, documentType = 'invoice' }: { data: any; color: any; documentType?: 'invoice' | 'quotation' }) {
  return (
    <div className="w-[600px]">
      {/* Header with document type banner */}
      <div className="text-center py-3 text-white font-bold text-lg" style={{ backgroundColor: color.primary }}>
        {documentType === 'quotation' ? 'QUOTATION' : 'TAX INVOICE'}
      </div>
      <div className="text-center text-xs py-1 bg-slate-100 text-slate-500">
        Original for Recipient
      </div>

      <div className="p-6">
        {/* Supplier & Invoice Details */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <p className="text-xs font-bold text-slate-400 mb-1">SUPPLIER DETAILS</p>
            <p className="font-bold text-lg">{data.companyName || 'Your Company Name'}</p>
            <p className="text-sm text-slate-600">GSTIN: {data.companyGstin || '33XXXXX1234X1Z5'}</p>
            <p className="text-sm text-slate-600">{data.companyAddress || 'Address'}</p>
            <p className="text-sm text-slate-600">{data.companyPhone}</p>
          </div>
          <div className="text-right">
            <div className="p-3 rounded-lg inline-block text-left" style={{ backgroundColor: color.secondary }}>
              <p className="text-xs text-slate-500">Invoice No</p>
              <p className="font-bold" style={{ color: color.primary }}>{data.invoiceNumber}</p>
              <p className="text-xs text-slate-500 mt-2">Date</p>
              <p className="font-semibold">{data.invoiceDate}</p>
              <p className="text-xs text-slate-500 mt-2">Place of Supply</p>
              <p className="font-semibold">Tamil Nadu</p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: color.secondary }}>
          <p className="text-xs font-bold text-slate-400 mb-1">BILL TO (RECIPIENT)</p>
          <p className="font-bold">{data.customerName}</p>
          <p className="text-sm text-slate-600">GSTIN: {data.customerGstin || 'Unregistered'}</p>
          <p className="text-sm text-slate-600">{data.customerPhone}</p>
        </div>

        {/* Items Table with HSN */}
        <table className="w-full mb-4 text-sm">
          <thead>
            <tr className="text-white text-xs" style={{ backgroundColor: color.primary }}>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-center">HSN</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-center">GST%</th>
              <th className="p-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-2">{i + 1}</td>
                <td className="p-2 font-medium">{item.name}</td>
                <td className="p-2 text-center text-slate-500">{item.hsn || '-'}</td>
                <td className="p-2 text-center">{item.quantity}</td>
                <td className="p-2 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                <td className="p-2 text-center">{item.gstRate || '18'}%</td>
                <td className="p-2 text-right font-semibold">₹{item.total.toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tax Summary & Totals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-slate-50">
            <p className="text-xs font-bold text-slate-400 mb-2">TAX SUMMARY</p>
            <div className="text-sm space-y-1">
              <div className="flex justify-between"><span>CGST (9%)</span><span>₹{(data.tax / 2).toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span>SGST (9%)</span><span>₹{(data.tax / 2).toLocaleString('en-IN')}</span></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between py-1 text-sm"><span>Subtotal</span><span>₹{data.subtotal.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between py-1 text-sm"><span>Tax</span><span>₹{data.tax.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between py-2 mt-2 rounded-lg text-white font-bold px-3" style={{ backgroundColor: color.primary }}>
              <span>TOTAL</span><span>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
            {data.balance > 0 && (
              <div className="flex justify-between py-1 text-sm mt-2">
                <span>Balance Due</span><span className="text-red-500 font-bold">₹{data.balance.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between">
          <div className="text-xs text-slate-400">
            <p>Bank: [Bank Name] | A/C: [Number] | IFSC: [Code]</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-6">For {data.companyName || 'Company'}</p>
            <p className="text-xs text-slate-500 border-t border-slate-300 pt-1">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// GST Compliant Template - Full Government Format
function GSTCompliantTemplate({ data, color, documentType = 'invoice', paperSize = 'a4' }: { data: any; color: any; documentType?: 'invoice' | 'quotation'; paperSize?: 'a4' | 'a5' | 'letter' }) {
  const isA5 = paperSize === 'a5'
  return (
    <div className={isA5 ? "w-full text-[9px] overflow-hidden" : "w-[600px] text-xs overflow-hidden"} style={{ maxWidth: '100%' }}>
      {/* Header - Government Style */}
      <div className={`text-center ${isA5 ? 'py-1 text-[10px]' : 'py-2'} text-white font-bold`} style={{ backgroundColor: color.primary }}>
        {documentType === 'quotation' ? 'QUOTATION' : 'TAX INVOICE'}
      </div>
      {documentType === 'invoice' && (
        <div className={`text-center ${isA5 ? 'text-[7px]' : 'text-[10px]'} py-0.5 bg-gray-100 text-gray-500`}>
          (Under Section 31 of CGST Act, 2017 read with Rule 46 of CGST Rules, 2017)
        </div>
      )}

      <div className={`${isA5 ? 'p-2' : 'p-4'} border-l border-r border-b border-slate-300`}>
        {/* Supplier & Invoice Row */}
        <div className={`grid grid-cols-2 gap-2 border-b border-slate-200 ${isA5 ? 'pb-1 mb-1' : 'pb-3 mb-3'}`}>
          <div>
            <p className={`font-bold ${isA5 ? 'text-[7px]' : 'text-[10px]'} text-slate-500`}>SUPPLIER DETAILS</p>
            <p className={`font-bold ${isA5 ? 'text-[9px] mt-0.5' : 'text-sm mt-1'}`}>{data.companyName || 'Your Company Name'}</p>
            <p className={`text-slate-600 ${isA5 ? 'text-[8px]' : ''}`}><span className="font-semibold">GSTIN:</span> {data.companyGstin || '33AABCU9603R1ZM'}</p>
            <p className={`text-slate-600 ${isA5 ? 'text-[8px]' : ''}`}>{data.companyAddress || '123 Business St, Chennai'}</p>
            <p className={`text-slate-600 ${isA5 ? 'text-[8px]' : ''}`}>State: Tamil Nadu (33) | Ph: {data.companyPhone}</p>
          </div>
          <div className="border-l border-slate-200 pl-2">
            <table className={`w-full ${isA5 ? 'text-[8px]' : 'text-[11px]'}`}>
              <tbody>
                <tr><td className="py-0.5 text-slate-500">{isA5 ? 'Inv#:' : 'Invoice No:'}</td><td className="font-semibold">{data.invoiceNumber}</td></tr>
                <tr><td className="py-0.5 text-slate-500">Date:</td><td className="font-semibold">{data.invoiceDate}</td></tr>
                <tr><td className="py-0.5 text-slate-500">{isA5 ? 'Supply:' : 'Place of Supply:'}</td><td className="font-semibold">Tamil Nadu (33)</td></tr>
                <tr><td className="py-0.5 text-slate-500">{isA5 ? 'Rev.Chg:' : 'Reverse Charge:'}</td><td className="font-semibold">No</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Recipient Details */}
        <div className={`border border-slate-200 rounded ${isA5 ? 'p-1 mb-1' : 'p-2 mb-3'}`} style={{ backgroundColor: '#f8fafc' }}>
          <p className={`font-bold ${isA5 ? 'text-[7px]' : 'text-[10px]'} text-slate-500`}>RECIPIENT (BILL TO)</p>
          <div className="grid grid-cols-2 mt-0.5">
            <div className={isA5 ? 'text-[8px]' : ''}>
              <p className="font-semibold">{data.customerName}</p>
              <p className="text-slate-600">GSTIN: {data.customerGstin || 'URP (Unregistered)'}</p>
            </div>
            <div className={isA5 ? 'text-[8px]' : ''}>
              <p className="text-slate-600">Phone: {data.customerPhone}</p>
              <p className="text-slate-600">State: Tamil Nadu</p>
            </div>
          </div>
        </div>

        {/* Items Table - GST Format */}
        <div className="overflow-x-auto mb-3">
          <table className="w-full border border-slate-300" style={{ tableLayout: 'fixed', minWidth: isA5 ? '100%' : '580px' }}>
            <thead>
              <tr className={`text-white ${isA5 ? 'text-[8px]' : 'text-[9px]'}`} style={{ backgroundColor: color.primary }}>
                <th className="border border-slate-400 p-0.5" style={{ width: '5%' }}>#</th>
                <th className="border border-slate-400 p-0.5 text-left" style={{ width: isA5 ? '30%' : '22%' }}>Item</th>
                <th className="border border-slate-400 p-0.5" style={{ width: '10%' }}>HSN</th>
                <th className="border border-slate-400 p-0.5" style={{ width: '7%' }}>Qty</th>
                <th className="border border-slate-400 p-0.5" style={{ width: '12%' }}>Rate</th>
                <th className="border border-slate-400 p-0.5" style={{ width: '13%' }}>Taxable</th>
                {!isA5 && <th className="border border-slate-400 p-0.5" style={{ width: '10%' }}>CGST</th>}
                {!isA5 && <th className="border border-slate-400 p-0.5" style={{ width: '10%' }}>SGST</th>}
                <th className="border border-slate-400 p-0.5" style={{ width: isA5 ? '23%' : '11%' }}>Total</th>
              </tr>
            </thead>
            <tbody className={isA5 ? 'text-[8px]' : 'text-[9px]'}>
              {data.items.map((item: any, i: number) => {
                const taxableValue = item.price * item.quantity
                const cgst = taxableValue * 0.09
                const sgst = taxableValue * 0.09
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-200 p-0.5 text-center">{i + 1}</td>
                    <td className="border border-slate-200 p-0.5 overflow-hidden text-ellipsis whitespace-nowrap" style={{ maxWidth: '120px' }} title={item.name}>{item.name}</td>
                    <td className="border border-slate-200 p-0.5 text-center">{item.hsn || '8471'}</td>
                    <td className="border border-slate-200 p-0.5 text-center">{item.quantity}</td>
                    <td className="border border-slate-200 p-0.5 text-right whitespace-nowrap">₹{item.price.toLocaleString('en-IN')}</td>
                    <td className="border border-slate-200 p-0.5 text-right whitespace-nowrap">₹{taxableValue.toLocaleString('en-IN')}</td>
                    {!isA5 && <td className="border border-slate-200 p-0.5 text-right text-slate-600 whitespace-nowrap">₹{cgst.toFixed(0)}</td>}
                    {!isA5 && <td className="border border-slate-200 p-0.5 text-right text-slate-600 whitespace-nowrap">₹{sgst.toFixed(0)}</td>}
                    <td className="border border-slate-200 p-0.5 text-right font-semibold whitespace-nowrap">₹{item.total.toLocaleString('en-IN')}</td>
                  </tr>
                )
              })}
            </tbody>
          <tfoot className={`${isA5 ? 'text-[8px]' : 'text-[10px]'} font-semibold bg-slate-100`}>
            <tr>
              <td colSpan={isA5 ? 5 : 5} className="border border-slate-200 p-0.5 text-right">Total:</td>
              <td className="border border-slate-200 p-0.5 text-right">₹{data.subtotal.toLocaleString('en-IN')}</td>
              {!isA5 && <td className="border border-slate-200 p-0.5 text-right">₹{(data.tax / 2).toFixed(0)}</td>}
              {!isA5 && <td className="border border-slate-200 p-0.5 text-right">₹{(data.tax / 2).toFixed(0)}</td>}
              <td className="border border-slate-200 p-0.5 text-right">₹{data.total.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
          </table>
        </div>

        {/* HSN-wise Tax Breakdown - As per GST Rules */}
        {(() => {
          // Group items by HSN code and calculate tax breakdown
          const hsnBreakdown: { [hsn: string]: { taxableValue: number; cgstRate: number; cgstAmt: number; sgstRate: number; sgstAmt: number; igstRate: number; igstAmt: number; total: number } } = {}
          
          data.items.forEach((item: any) => {
            const hsn = item.hsn || item.hsnCode || '9999'
            const taxableValue = item.price * item.quantity
            const taxRate = item.gst || item.tax || 18
            const cgstRate = item.cgstPercent || taxRate / 2
            const sgstRate = item.sgstPercent || taxRate / 2
            const igstRate = item.igstPercent || 0
            const cgstAmt = item.cgstAmount || (igstRate === 0 ? taxableValue * (cgstRate / 100) : 0)
            const sgstAmt = item.sgstAmount || (igstRate === 0 ? taxableValue * (sgstRate / 100) : 0)
            const igstAmt = item.igstAmount || (igstRate > 0 ? taxableValue * (igstRate / 100) : 0)
            
            if (!hsnBreakdown[hsn]) {
              hsnBreakdown[hsn] = { taxableValue: 0, cgstRate, cgstAmt: 0, sgstRate, sgstAmt: 0, igstRate, igstAmt: 0, total: 0 }
            }
            hsnBreakdown[hsn].taxableValue += taxableValue
            hsnBreakdown[hsn].cgstAmt += cgstAmt
            hsnBreakdown[hsn].sgstAmt += sgstAmt
            hsnBreakdown[hsn].igstAmt += igstAmt
            hsnBreakdown[hsn].total += taxableValue + cgstAmt + sgstAmt + igstAmt
          })
          
          const hsnEntries = Object.entries(hsnBreakdown)
          const totalTaxableValue = hsnEntries.reduce((sum, [, v]) => sum + v.taxableValue, 0)
          const totalCGST = hsnEntries.reduce((sum, [, v]) => sum + v.cgstAmt, 0)
          const totalSGST = hsnEntries.reduce((sum, [, v]) => sum + v.sgstAmt, 0)
          const totalIGST = hsnEntries.reduce((sum, [, v]) => sum + v.igstAmt, 0)
          const grandTotal = hsnEntries.reduce((sum, [, v]) => sum + v.total, 0)
          
          return (
            <div className="mb-3 border border-slate-300 overflow-hidden">
              <div className="px-2 py-0.5 bg-slate-100 border-b border-slate-300">
                <p className={`${isA5 ? 'text-[8px]' : 'text-[9px]'} font-bold text-slate-700`}>Tax Details</p>
              </div>
              <div className="overflow-x-auto">
              <table className={`w-full ${isA5 ? 'text-[7px]' : 'text-[8px]'}`} style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-0.5 border-r border-slate-200 text-center font-semibold" style={{ width: isA5 ? '8%' : '5%' }}>#</th>
                    <th className="p-0.5 border-r border-slate-200 text-center font-semibold" style={{ width: isA5 ? '15%' : '12%' }}>HSN</th>
                    <th className="p-0.5 border-r border-slate-200 text-right font-semibold" style={{ width: isA5 ? '22%' : '15%' }}>Taxable</th>
                    {!isA5 && <th colSpan={2} className="p-0.5 border-r border-slate-200 text-center font-semibold" style={{ width: '17%' }}>CGST</th>}
                    {!isA5 && <th colSpan={2} className="p-0.5 border-r border-slate-200 text-center font-semibold" style={{ width: '17%' }}>SGST</th>}
                    {!isA5 && <th colSpan={2} className="p-0.5 border-r border-slate-200 text-center font-semibold" style={{ width: '17%' }}>IGST</th>}
                    {isA5 && <th className="p-0.5 border-r border-slate-200 text-right font-semibold" style={{ width: '18%' }}>CGST</th>}
                    {isA5 && <th className="p-0.5 border-r border-slate-200 text-right font-semibold" style={{ width: '18%' }}>SGST</th>}
                    <th className="p-0.5 text-right font-semibold" style={{ width: isA5 ? '19%' : '12%' }}>Total</th>
                  </tr>
                  {!isA5 && (
                    <tr className="bg-slate-50 border-b border-slate-300 text-[8px]">
                      <th className="p-0.5 border-r border-slate-200"></th>
                      <th className="p-0.5 border-r border-slate-200"></th>
                      <th className="p-0.5 border-r border-slate-200"></th>
                      <th className="p-0.5 border-r border-slate-200 text-center font-normal">Rate</th>
                      <th className="p-0.5 border-r border-slate-200 text-right font-normal">Amt</th>
                      <th className="p-0.5 border-r border-slate-200 text-center font-normal">Rate</th>
                      <th className="p-0.5 border-r border-slate-200 text-right font-normal">Amt</th>
                      <th className="p-0.5 border-r border-slate-200 text-center font-normal">Rate</th>
                      <th className="p-0.5 border-r border-slate-200 text-right font-normal">Amt</th>
                      <th className="p-0.5"></th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {hsnEntries.map(([hsn, values], idx) => (
                    <tr key={hsn} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="p-0.5 border-r border-slate-200 text-center">{idx + 1}</td>
                      <td className="p-0.5 border-r border-slate-200 text-center font-medium">{hsn}</td>
                      <td className="p-0.5 border-r border-slate-200 text-right">{values.taxableValue.toFixed(isA5 ? 0 : 2)}</td>
                      {!isA5 && <td className="p-0.5 border-r border-slate-200 text-center">{values.cgstRate}%</td>}
                      {!isA5 && <td className="p-0.5 border-r border-slate-200 text-right">{values.cgstAmt.toFixed(2)}</td>}
                      {!isA5 && <td className="p-0.5 border-r border-slate-200 text-center">{values.sgstRate}%</td>}
                      {!isA5 && <td className="p-0.5 border-r border-slate-200 text-right">{values.sgstAmt.toFixed(2)}</td>}
                      {!isA5 && <td className="p-0.5 border-r border-slate-200 text-center">{values.igstRate > 0 ? `${values.igstRate}%` : '-'}</td>}
                      {!isA5 && <td className="p-0.5 border-r border-slate-200 text-right">{values.igstAmt.toFixed(2)}</td>}
                      {isA5 && <td className="p-0.5 border-r border-slate-200 text-right">{values.cgstAmt.toFixed(0)}</td>}
                      {isA5 && <td className="p-0.5 border-r border-slate-200 text-right">{values.sgstAmt.toFixed(0)}</td>}
                      <td className="p-0.5 text-right font-medium">{values.total.toFixed(isA5 ? 0 : 2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-semibold border-t border-slate-300">
                    <td colSpan={2} className="p-0.5 border-r border-slate-200 text-right">Total</td>
                    <td className="p-0.5 border-r border-slate-200 text-right">{totalTaxableValue.toFixed(isA5 ? 0 : 2)}</td>
                    {!isA5 && <td className="p-0.5 border-r border-slate-200"></td>}
                    {!isA5 && <td className="p-0.5 border-r border-slate-200 text-right">{totalCGST.toFixed(2)}</td>}
                    {!isA5 && <td className="p-0.5 border-r border-slate-200"></td>}
                    {!isA5 && <td className="p-0.5 border-r border-slate-200 text-right">{totalSGST.toFixed(2)}</td>}
                    {!isA5 && <td className="p-0.5 border-r border-slate-200"></td>}
                    {!isA5 && <td className="p-0.5 border-r border-slate-200 text-right">{totalIGST.toFixed(2)}</td>}
                    {isA5 && <td className="p-0.5 border-r border-slate-200 text-right">{totalCGST.toFixed(0)}</td>}
                    {isA5 && <td className="p-0.5 border-r border-slate-200 text-right">{totalSGST.toFixed(0)}</td>}
                    <td className="p-0.5 text-right">{grandTotal.toFixed(isA5 ? 0 : 2)}</td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>
          )
        })()}

        {/* Amount in Words & Totals */}
        <div className={`grid ${isA5 ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-2'} mb-3`}>
          <div className={`${isA5 ? 'p-1' : 'p-2'} bg-slate-50 rounded border border-slate-200 overflow-hidden`}>
            <p className={`${isA5 ? 'text-[7px]' : 'text-[9px]'} font-bold text-slate-500`}>AMOUNT IN WORDS</p>
            <p className={`${isA5 ? 'text-[8px]' : 'text-[10px]'} font-semibold mt-0.5 break-words`}>Rupees {numberToWordsSimple(data.total)} Only</p>
          </div>
          <div className={`${isA5 ? 'p-1' : 'p-2'} bg-blue-50 rounded border border-blue-200`}>
            <div className={`flex justify-between ${isA5 ? 'text-[8px]' : 'text-[10px]'}`}><span>Taxable:</span><span className="whitespace-nowrap">₹{data.subtotal.toLocaleString('en-IN')}</span></div>
            <div className={`flex justify-between ${isA5 ? 'text-[8px]' : 'text-[10px]'}`}><span>CGST @9%:</span><span className="whitespace-nowrap">₹{(data.tax / 2).toFixed(0)}</span></div>
            <div className={`flex justify-between ${isA5 ? 'text-[8px]' : 'text-[10px]'}`}><span>SGST @9%:</span><span className="whitespace-nowrap">₹{(data.tax / 2).toFixed(0)}</span></div>
            <div className={`flex justify-between ${isA5 ? 'text-[9px]' : 'text-[11px]'} font-bold mt-1 pt-1 border-t border-blue-300`}>
              <span>Grand Total:</span><span className="whitespace-nowrap" style={{ color: '#003366' }}>₹{data.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Payment Received Section - Vyapar/Marg Style */}
        {data.received > 0 && (
          <div className="mb-3 p-2 bg-emerald-50 rounded border border-emerald-200">
            <p className="text-[10px] font-bold text-emerald-700 mb-1">PAYMENT RECEIVED</p>
            <div className="flex justify-between text-[11px]">
              <span className="text-emerald-800">
                ₹{data.received.toLocaleString('en-IN')} via{' '}
                <span className="font-semibold capitalize">{data.payment?.mode || 'Cash'}</span>
                {data.payment?.bankName && (
                  <span> – {data.payment.bankName}</span>
                )}
                {data.payment?.bankAccount && (
                  <span className="text-emerald-600"> (A/c ***{data.payment.bankAccount.slice(-4)})</span>
                )}
              </span>
              <span className="text-emerald-600 font-semibold">✓</span>
            </div>
            {data.payment?.reference && (
              <p className="text-[10px] text-emerald-600 mt-0.5">Ref: {data.payment.reference}</p>
            )}
            {data.balance > 0 && (
              <div className="flex justify-between text-[11px] mt-1 pt-1 border-t border-emerald-300">
                <span className="font-semibold text-red-600">Balance Due:</span>
                <span className="font-bold text-red-600">₹{data.balance.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        )}

        {/* Bank & Signature */}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
          <div className="overflow-hidden">
            <p className={`${isA5 ? 'text-[8px]' : 'text-[9px]'} font-bold text-slate-500`}>BANK DETAILS</p>
            <p className={`${isA5 ? 'text-[7px]' : 'text-[9px]'} text-slate-600 truncate`}>Bank: [Your Bank Name]</p>
            <p className={`${isA5 ? 'text-[7px]' : 'text-[9px]'} text-slate-600 truncate`}>A/C No: [Account Number]</p>
            <p className={`${isA5 ? 'text-[7px]' : 'text-[9px]'} text-slate-600 truncate`}>IFSC: [IFSC Code]</p>
            <p className={`${isA5 ? 'text-[7px]' : 'text-[9px]'} text-slate-600 truncate`}>Branch: [Branch Name]</p>
          </div>
          <div className="text-right overflow-hidden">
            <p className={`${isA5 ? 'text-[8px]' : 'text-[9px]'} text-slate-500 truncate`}>For {data.companyName || 'Company Name'}</p>
            <div className="h-8"></div>
            <p className={`${isA5 ? 'text-[8px]' : 'text-[9px]'} border-t border-slate-300 pt-1 inline-block`}>Authorized Signatory</p>
          </div>
        </div>

        {/* Terms */}
        <div className="mt-2 pt-2 border-t border-slate-200">
          <p className={`${isA5 ? 'text-[7px]' : 'text-[8px]'} text-slate-400 break-words`}>
            <span className="font-semibold">Terms:</span> 1. Goods once sold will not be taken back. 2. Interest @18% p.a. charged on delayed payments. 3. Subject to local jurisdiction.
          </p>
        </div>

        {/* Footer */}
        <div className={`mt-2 text-center ${isA5 ? 'text-[7px]' : 'text-[8px]'} text-slate-400`}>
          This is a computer-generated invoice and does not require a physical signature. | GST Compliant Invoice
        </div>
      </div>
    </div>
  )
}

// Helper for GST Compliant Template
function numberToWordsSimple(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const n = Math.floor(num)
  if (n === 0) return 'Zero'
  if (n < 20) return ones[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numberToWordsSimple(n % 100) : '')
  if (n < 100000) return numberToWordsSimple(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numberToWordsSimple(n % 1000) : '')
  if (n < 10000000) return numberToWordsSimple(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numberToWordsSimple(n % 100000) : '')
  return numberToWordsSimple(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numberToWordsSimple(n % 10000000) : '')
}
