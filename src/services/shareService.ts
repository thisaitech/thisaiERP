// Share Service
// Share invoices via WhatsApp, Email, etc.

import { InvoicePDFData, getInvoicePDFBlob } from './pdfService'

/**
 * Share invoice via WhatsApp
 * Opens WhatsApp with pre-filled message
 */
export function shareViaWhatsApp(phone: string, invoiceNumber: string, amount: number, companyName: string) {
  // Format phone number (remove spaces, dashes, etc.)
  const cleanPhone = phone.replace(/[^\d+]/g, '')

  // Ensure amount is a valid number
  const validAmount = Number(amount) || 0

  // Create message
  const message = `Hello!

Here is your invoice from *${companyName}*

Invoice Number: *${invoiceNumber}*
Amount: *₹${validAmount.toLocaleString('en-IN')}*

Thank you for your business!

_This message was sent via Anna ERP_`

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)

  // WhatsApp URL
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`

  // Open in new window
  window.open(whatsappUrl, '_blank')
}

/**
 * Share payment reminder via WhatsApp
 */
export function sendPaymentReminderWhatsApp(
  phone: string,
  partyName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  companyName: string
) {
  const cleanPhone = phone.replace(/[^\d+]/g, '')

  const overdueDays = Math.floor(
    (new Date().getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  const message = overdueDays > 0
    ? `Dear ${partyName},

This is a friendly reminder that your payment is *${overdueDays} days overdue*.

Invoice: *${invoiceNumber}*
Amount Due: *₹${amount.toLocaleString('en-IN')}*
Due Date: *${new Date(dueDate).toLocaleDateString('en-IN')}*

Please arrange the payment at the earliest.

If already paid, please share the payment details.

Thank you!
_${companyName}_`
    : `Dear ${partyName},

This is a friendly reminder for the upcoming payment.

Invoice: *${invoiceNumber}*
Amount Due: *₹${amount.toLocaleString('en-IN')}*
Due Date: *${new Date(dueDate).toLocaleDateString('en-IN')}*

Please arrange the payment before the due date.

Thank you!
_${companyName}_`

  const encodedMessage = encodeURIComponent(message)
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`

  window.open(whatsappUrl, '_blank')
}

/**
 * Share via Email
 */
export function shareViaEmail(
  email: string,
  subject: string,
  body: string,
  invoiceData?: InvoicePDFData
) {
  const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(mailto, '_blank')
}

/**
 * Copy invoice link to clipboard
 */
export async function copyInvoiceLink(invoiceId: string): Promise<boolean> {
  try {
    const baseUrl = window.location.origin
    const invoiceUrl = `${baseUrl}/invoice/${invoiceId}`

    await navigator.clipboard.writeText(invoiceUrl)
    return true
  } catch (error) {
    console.error('Failed to copy link:', error)
    return false
  }
}

/**
 * Share invoice details as text
 */
export function getInvoiceShareText(
  invoiceNumber: string,
  partyName: string,
  amount: number,
  items: Array<{ name: string; quantity: number; rate: number }>,
  companyName: string
): string {
  const itemsList = items
    .map(item => `${item.quantity}x ${item.name} @ ₹${item.rate}`)
    .join('\n')

  return `${companyName}
TAX INVOICE

Invoice: ${invoiceNumber}
Customer: ${partyName}

ITEMS:
${itemsList}

Total Amount: ₹${amount.toLocaleString('en-IN')}

Thank you for your business!
`
}

/**
 * Download invoice PDF and share
 */
export async function shareInvoicePDF(invoiceData: InvoicePDFData): Promise<void> {
  try {
    // Check if Web Share API is supported
    if (navigator.share) {
      const blob = getInvoicePDFBlob(invoiceData)
      const file = new File([blob], `Invoice-${invoiceData.invoiceNumber}.pdf`, {
        type: 'application/pdf'
      })

      await navigator.share({
        title: `Invoice ${invoiceData.invoiceNumber}`,
        text: `Invoice from ${invoiceData.companyName}`,
        files: [file]
      })
    } else {
      // Fallback: Just download
      const link = document.createElement('a')
      const blob = getInvoicePDFBlob(invoiceData)
      const url = URL.createObjectURL(blob)
      link.href = url
      const filename = `Invoice-${invoiceData.invoiceNumber}.pdf`
      link.href = url
      link.download = filename
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 150)
    }
  } catch (error) {
    console.error('Error sharing PDF:', error)
    throw error
  }
}

/**
 * Format phone number for WhatsApp (add country code if missing)
 */
export function formatPhoneForWhatsApp(phone: string, defaultCountryCode: string = '91'): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')

  // If doesn't start with country code, add it
  if (!cleaned.startsWith(defaultCountryCode)) {
    cleaned = defaultCountryCode + cleaned
  }

  return cleaned
}

/**
 * Validate if phone number is WhatsApp-compatible
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  // Must be at least 10 digits (country code + number)
  return cleaned.length >= 10 && cleaned.length <= 15
}
