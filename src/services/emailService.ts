/**
 * Email Invoice Service
 *
 * Send invoices via email with PDF attachment
 */

import type { Invoice } from '../types'
import { generateInvoicePDF } from './pdfService'

export interface EmailConfig {
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPassword: string
  fromEmail: string
  fromName: string
}

export interface EmailLog {
  id: string
  invoiceId: string
  invoiceNumber: string
  recipientEmail: string
  recipientName: string
  subject: string
  sentAt: string
  status: 'sent' | 'failed' | 'pending'
  errorMessage?: string
  opened?: boolean
  openedAt?: string
}

const STORAGE_KEY_LOGS = 'emailLogs'
const STORAGE_KEY_CONFIG = 'emailConfig'

/**
 * Get email configuration
 */
export async function getEmailConfig(): Promise<EmailConfig | null> {
  try {
    const data = localStorage.getItem(STORAGE_KEY_CONFIG)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('Error getting email config:', error)
    return null
  }
}

/**
 * Save email configuration
 */
export async function saveEmailConfig(config: EmailConfig): Promise<boolean> {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config))
    return true
  } catch (error) {
    console.error('Error saving email config:', error)
    return false
  }
}

/**
 * Get email logs
 */
export async function getEmailLogs(): Promise<EmailLog[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEY_LOGS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('Error getting email logs:', error)
    return []
  }
}

/**
 * Get email logs for specific invoice
 */
export async function getEmailLogsByInvoice(invoiceId: string): Promise<EmailLog[]> {
  try {
    const logs = await getEmailLogs()
    return logs.filter(log => log.invoiceId === invoiceId)
  } catch (error) {
    console.error('Error getting email logs for invoice:', error)
    return []
  }
}

/**
 * Generate email template for invoice
 */
export function generateInvoiceEmailTemplate(
  invoice: Invoice,
  customMessage?: string
): { subject: string; html: string; text: string } {
  const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.businessName}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #fff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .invoice-details {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .amount {
          font-size: 32px;
          font-weight: bold;
          color: #667eea;
          margin: 10px 0;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invoice from ${invoice.businessName}</h1>
        </div>
        <div class="content">
          <p>Dear ${invoice.partyName},</p>

          ${customMessage ? `<p>${customMessage}</p>` : `
          <p>Thank you for your business! Please find attached invoice for your recent transaction.</p>
          `}

          <div class="invoice-details">
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Invoice Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
            ${invoice.dueDate ? `<p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</p>` : ''}
            <p class="amount">₹${invoice.grandTotal.toFixed(2)}</p>
            <p><strong>Payment Status:</strong> ${invoice.payment.status === 'paid' ? 'Paid ✓' : invoice.payment.status === 'partial' ? 'Partially Paid' : 'Pending'}</p>
            ${invoice.payment.dueAmount > 0 ? `<p><strong>Amount Due:</strong> ₹${invoice.payment.dueAmount.toFixed(2)}</p>` : ''}
          </div>

          ${invoice.payment.dueAmount > 0 ? `
          <p>You can make payment via:</p>
          <ul>
            <li>Bank Transfer</li>
            <li>UPI</li>
            <li>Cash</li>
            <li>Online Payment Link (if available)</li>
          </ul>
          ` : ''}

          <p>The invoice PDF is attached to this email for your records.</p>

          <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>

          <p>Best regards,<br>
          ${invoice.businessName}<br>
          ${invoice.businessPhone}<br>
          ${invoice.businessEmail}</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} ${invoice.businessName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Invoice from ${invoice.businessName}

Dear ${invoice.partyName},

${customMessage || 'Thank you for your business! Please find attached invoice for your recent transaction.'}

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
${invoice.dueDate ? `- Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}` : ''}
- Amount: ₹${invoice.grandTotal.toFixed(2)}
- Status: ${invoice.payment.status}
${invoice.payment.dueAmount > 0 ? `- Amount Due: ₹${invoice.payment.dueAmount.toFixed(2)}` : ''}

Best regards,
${invoice.businessName}
${invoice.businessPhone}
${invoice.businessEmail}
  `

  return { subject, html, text }
}

/**
 * Send invoice via email
 */
export async function sendInvoiceEmail(
  invoice: Invoice,
  options: {
    recipientEmail?: string
    recipientName?: string
    cc?: string[]
    bcc?: string[]
    customMessage?: string
    attachPDF?: boolean
  } = {}
): Promise<EmailLog> {
  try {
    const config = await getEmailConfig()

    if (!config) {
      throw new Error('Email configuration not found. Please configure SMTP settings.')
    }

    const recipientEmail = options.recipientEmail || invoice.partyEmail
    const recipientName = options.recipientName || invoice.partyName

    if (!recipientEmail) {
      throw new Error('Recipient email is required')
    }

    const { subject, html, text } = generateInvoiceEmailTemplate(invoice, options.customMessage)

    // Generate PDF if needed
    let pdfBase64 = ''
    if (options.attachPDF !== false) {
      // In production, generate PDF blob and convert to base64
      // const pdfBlob = await generateInvoicePDF(invoice)
      // pdfBase64 = await blobToBase64(pdfBlob)
    }

    // In production, send via backend email service
    /*
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: { email: config.fromEmail, name: config.fromName },
        to: [{ email: recipientEmail, name: recipientName }],
        cc: options.cc,
        bcc: options.bcc,
        subject,
        html,
        text,
        attachments: pdfBase64 ? [{
          filename: `Invoice_${invoice.invoiceNumber}.pdf`,
          content: pdfBase64,
          type: 'application/pdf'
        }] : []
      })
    })

    if (!response.ok) {
      throw new Error('Failed to send email')
    }
    */

    // For demo, create email log
    const emailLog: EmailLog = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      recipientEmail,
      recipientName,
      subject,
      sentAt: new Date().toISOString(),
      status: 'sent' // In production, this would be based on actual send result
    }

    // Save log
    const logs = await getEmailLogs()
    logs.push(emailLog)
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs))

    // For demo, open mailto link
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
    window.location.href = mailtoUrl

    return emailLog
  } catch (error) {
    console.error('Error sending invoice email:', error)

    // Create failed log
    const emailLog: EmailLog = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      recipientEmail: options.recipientEmail || invoice.partyEmail || '',
      recipientName: options.recipientName || invoice.partyName,
      subject: `Invoice ${invoice.invoiceNumber}`,
      sentAt: new Date().toISOString(),
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }

    const logs = await getEmailLogs()
    logs.push(emailLog)
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs))

    throw error
  }
}

/**
 * Send bulk invoices via email
 */
export async function sendBulkInvoiceEmails(
  invoices: Invoice[],
  options: {
    customMessage?: string
    attachPDF?: boolean
  } = {}
): Promise<{ sent: number; failed: number; logs: EmailLog[] }> {
  const results = {
    sent: 0,
    failed: 0,
    logs: [] as EmailLog[]
  }

  for (const invoice of invoices) {
    try {
      const log = await sendInvoiceEmail(invoice, options)
      results.sent++
      results.logs.push(log)
    } catch (error) {
      results.failed++
    }
  }

  return results
}

/**
 * Track email open (via pixel/webhook)
 */
export async function trackEmailOpen(emailId: string): Promise<boolean> {
  try {
    const logs = await getEmailLogs()
    const log = logs.find(l => l.id === emailId)

    if (!log) return false

    log.opened = true
    log.openedAt = new Date().toISOString()

    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs))

    return true
  } catch (error) {
    console.error('Error tracking email open:', error)
    return false
  }
}

/**
 * Get email statistics
 */
export async function getEmailStats(): Promise<{
  totalSent: number
  totalFailed: number
  totalOpened: number
  openRate: number
}> {
  try {
    const logs = await getEmailLogs()

    const totalSent = logs.filter(l => l.status === 'sent').length
    const totalFailed = logs.filter(l => l.status === 'failed').length
    const totalOpened = logs.filter(l => l.opened === true).length
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0

    return {
      totalSent,
      totalFailed,
      totalOpened,
      openRate
    }
  } catch (error) {
    console.error('Error getting email stats:', error)
    return {
      totalSent: 0,
      totalFailed: 0,
      totalOpened: 0,
      openRate: 0
    }
  }
}
