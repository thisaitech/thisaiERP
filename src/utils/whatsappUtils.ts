// WhatsApp Integration Utilities

/**
 * Send invoice via WhatsApp
 */
export function sendInvoiceViaWhatsApp(
  phoneNumber: string,
  invoiceNumber: string,
  partyName: string,
  amount: number,
  invoiceType: 'sale' | 'purchase' | 'quotation' = 'sale'
) {
  // Format phone number (remove spaces, dashes, and add country code if needed)
  let formattedPhone = phoneNumber.replace(/[\s-]/g, '')

  // Add +91 for India if not present
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `91${formattedPhone}`
  } else if (formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.substring(1)
  }

  // Create message based on invoice type
  let message = ''

  if (invoiceType === 'sale') {
    message = `Dear ${partyName},

Thank you for your business!

*Invoice Details:*
Invoice No: ${invoiceNumber}
Amount: ₹${amount.toLocaleString('en-IN')}

Please find your invoice attached.

For any queries, feel free to contact us.

Thank you!`
  } else if (invoiceType === 'quotation') {
    message = `Dear ${partyName},

Here is your quotation:

*Quotation Details:*
Quotation No: ${invoiceNumber}
Amount: ₹${amount.toLocaleString('en-IN')}

Valid for 30 days from date of issue.

Looking forward to your confirmation.

Thank you!`
  } else if (invoiceType === 'purchase') {
    message = `Dear ${partyName},

*Purchase Order:*
PO No: ${invoiceNumber}
Amount: ₹${amount.toLocaleString('en-IN')}

Please confirm receipt.

Thank you!`
  }

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message)

  // Create WhatsApp URL
  const whatsappURL = `https://wa.me/${formattedPhone}?text=${encodedMessage}`

  // Open WhatsApp in new tab
  window.open(whatsappURL, '_blank')
}

/**
 * Share report summary via WhatsApp
 */
export function shareReportViaWhatsApp(
  phoneNumber: string,
  reportName: string,
  summary: string
) {
  let formattedPhone = phoneNumber.replace(/[\s-]/g, '')

  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `91${formattedPhone}`
  } else if (formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.substring(1)
  }

  const message = `*${reportName}*

${summary}

Generated on: ${new Date().toLocaleString('en-IN')}

---
Sent from Anna ERP`

  const encodedMessage = encodeURIComponent(message)
  const whatsappURL = `https://wa.me/${formattedPhone}?text=${encodedMessage}`

  window.open(whatsappURL, '_blank')
}

/**
 * Send payment reminder via WhatsApp
 */
export function sendPaymentReminder(
  phoneNumber: string,
  partyName: string,
  invoiceNumber: string,
  dueAmount: number,
  dueDate?: string
) {
  let formattedPhone = phoneNumber.replace(/[\s-]/g, '')

  if (!formattedPhone.startsWith('+')) {
    formattedPhone = `91${formattedPhone}`
  } else if (formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.substring(1)
  }

  const message = `Dear ${partyName},

This is a friendly reminder for the pending payment:

*Payment Details:*
Invoice No: ${invoiceNumber}
Due Amount: ₹${dueAmount.toLocaleString('en-IN')}
${dueDate ? `Due Date: ${dueDate}` : ''}

Please process the payment at your earliest convenience.

For any queries, feel free to contact us.

Thank you!`

  const encodedMessage = encodeURIComponent(message)
  const whatsappURL = `https://wa.me/${formattedPhone}?text=${encodedMessage}`

  window.open(whatsappURL, '_blank')
}

/**
 * Send report summary via WhatsApp (without phone - user can select contact)
 */
export function shareReportSummary(reportData: {
  reportName: string
  period?: string
  totalAmount?: number
  count?: number
  additionalInfo?: string
}) {
  const { reportName, period, totalAmount, count, additionalInfo } = reportData

  let message = `*${reportName}*\n\n`

  if (period) {
    message += `Period: ${period}\n`
  }

  if (count !== undefined) {
    message += `Total Records: ${count}\n`
  }

  if (totalAmount !== undefined) {
    message += `Total Amount: ₹${totalAmount.toLocaleString('en-IN')}\n`
  }

  if (additionalInfo) {
    message += `\n${additionalInfo}\n`
  }

  message += `\nGenerated: ${new Date().toLocaleString('en-IN')}\n`
  message += `\n---\nSent from Anna ERP`

  const encodedMessage = encodeURIComponent(message)
  const whatsappURL = `https://wa.me/?text=${encodedMessage}`

  window.open(whatsappURL, '_blank')
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Format as +91 XXXXX XXXXX for 10-digit Indian numbers
  if (digits.length === 10) {
    return `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`
  }

  // Format as +91 XXXXX XXXXX if starts with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits.substring(0, 2)} ${digits.substring(2, 7)} ${digits.substring(7)}`
  }

  // Return as-is if format is unknown
  return phone
}

/**
 * Validate phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Check if it's a 10-digit number or 12-digit with country code
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'))
}
