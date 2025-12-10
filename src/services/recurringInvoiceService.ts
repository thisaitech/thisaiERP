// Recurring Invoice Service - Auto-generate recurring invoices
import { createInvoice, type Invoice } from './invoiceService'

export interface RecurringInvoiceTemplate {
  id: string
  name: string
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  startDate: string
  endDate?: string // If null, runs indefinitely
  nextGenerationDate: string
  lastGenerationDate?: string
  isActive: boolean

  // Invoice template data
  type: 'sale' | 'purchase'
  partyId: string
  partyName: string
  partyGSTIN?: string
  partyPhone?: string
  partyEmail?: string
  partyAddress?: string
  partyCity?: string
  partyState?: string
  partyStateCode?: string
  partyPinCode?: string

  items: Array<{
    id: string
    description: string
    hsn?: string
    quantity: number
    unit: string
    rate: number
    amount: number
    taxRate: number
    tax: number
  }>

  subtotal: number
  taxAmount: number
  grandTotal: number

  // Additional settings
  autoGenerate: boolean // If true, auto-generate. If false, create draft only
  notifyParty: boolean // Send WhatsApp/email notification
  notifyAdmin: boolean // Notify admin when invoice is generated

  // Statistics
  totalGenerated: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

const LOCAL_STORAGE_KEY = 'thisai_crm_recurring_invoices'
const GENERATED_INVOICES_KEY = 'thisai_crm_recurring_generated'

/**
 * Create a recurring invoice template
 */
export async function createRecurringInvoice(
  template: Omit<RecurringInvoiceTemplate, 'id' | 'createdAt' | 'updatedAt' | 'totalGenerated'>
): Promise<RecurringInvoiceTemplate> {
  const recurring: RecurringInvoiceTemplate = {
    ...template,
    id: `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    totalGenerated: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  // Save to storage
  const templates = getRecurringInvoices()
  templates.push(recurring)
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates))

  return recurring
}

/**
 * Get all recurring invoice templates
 */
export function getRecurringInvoices(): RecurringInvoiceTemplate[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error reading recurring invoices:', error)
  }
  return []
}

/**
 * Get a single recurring invoice template
 */
export function getRecurringInvoice(id: string): RecurringInvoiceTemplate | null {
  const templates = getRecurringInvoices()
  return templates.find(t => t.id === id) || null
}

/**
 * Update recurring invoice template
 */
export function updateRecurringInvoice(
  id: string,
  updates: Partial<RecurringInvoiceTemplate>
): RecurringInvoiceTemplate | null {
  const templates = getRecurringInvoices()
  const index = templates.findIndex(t => t.id === id)

  if (index === -1) {
    return null
  }

  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: new Date().toISOString()
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates))
  return templates[index]
}

/**
 * Delete recurring invoice template
 */
export function deleteRecurringInvoice(id: string): boolean {
  const templates = getRecurringInvoices()
  const filtered = templates.filter(t => t.id !== id)

  if (filtered.length === templates.length) {
    return false // Not found
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
  return true
}

/**
 * Toggle active status
 */
export function toggleRecurringInvoice(id: string): RecurringInvoiceTemplate | null {
  const template = getRecurringInvoice(id)
  if (!template) return null

  return updateRecurringInvoice(id, { isActive: !template.isActive })
}

/**
 * Generate invoice from template
 */
export async function generateInvoiceFromTemplate(
  templateId: string,
  options: {
    generateDate?: string
    invoiceNumber?: string
    markAsGenerated?: boolean
  } = {}
): Promise<Invoice | null> {
  const template = getRecurringInvoice(templateId)

  if (!template) {
    throw new Error('Template not found')
  }

  const invoiceDate = options.generateDate || new Date().toISOString().split('T')[0]

  // Generate invoice number if not provided
  const invoiceNumber = options.invoiceNumber || generateInvoiceNumber(template, invoiceDate)

  // Create invoice from template
  const invoice: Omit<Invoice, 'id' | 'createdAt'> = {
    type: template.type,
    invoiceNumber: invoiceNumber,
    invoiceDate: invoiceDate,
    dueDate: calculateDueDate(invoiceDate, 30), // 30 days default

    // Party details
    partyId: template.partyId,
    partyName: template.partyName,
    partyGSTIN: template.partyGSTIN,
    partyPhone: template.partyPhone,
    partyEmail: template.partyEmail,
    partyStateCode: template.partyStateCode,

    // Billing details (same as party)
    billingAddress: template.partyAddress || '',
    billingCity: template.partyCity || '',
    billingState: template.partyState || '',
    billingStateCode: template.partyStateCode || '',
    billingPinCode: template.partyPinCode || '',

    // Shipping details (same as billing)
    shippingAddress: template.partyAddress || '',
    shippingCity: template.partyCity || '',
    shippingState: template.partyState || '',
    shippingStateCode: template.partyStateCode || '',
    shippingPinCode: template.partyPinCode || '',

    // Items
    items: template.items,

    // Totals
    subtotal: template.subtotal,
    taxAmount: template.taxAmount,
    grandTotal: template.grandTotal,

    // Payment
    payment: {
      status: 'pending',
      paidAmount: 0
    },

    // Metadata
    notes: `Auto-generated from recurring template: ${template.name}`,
    termsAndConditions: 'Payment due within 30 days',
    createdBy: 'Recurring Invoice System',
    recurringTemplateId: templateId
  }

  // Create the invoice
  const createdInvoice = await createInvoice(invoice as any)

  // Update template stats if markAsGenerated is true
  if (options.markAsGenerated !== false && createdInvoice) {
    updateRecurringInvoice(templateId, {
      lastGenerationDate: invoiceDate,
      nextGenerationDate: calculateNextGenerationDate(template),
      totalGenerated: template.totalGenerated + 1
    })

    // Track generated invoice
    trackGeneratedInvoice(templateId, createdInvoice.id, invoiceDate)
  }

  return createdInvoice
}

/**
 * Check and auto-generate due invoices
 */
export async function checkAndGenerateRecurringInvoices(): Promise<{
  generated: number
  failed: number
  invoices: Invoice[]
}> {
  const templates = getRecurringInvoices().filter(t => t.isActive && t.autoGenerate)
  const today = new Date().toISOString().split('T')[0]

  let generated = 0
  let failed = 0
  const invoices: Invoice[] = []

  for (const template of templates) {
    // Check if generation is due
    if (template.nextGenerationDate <= today) {
      // Check if end date has passed
      if (template.endDate && template.endDate < today) {
        // Deactivate template
        updateRecurringInvoice(template.id, { isActive: false })
        continue
      }

      try {
        const invoice = await generateInvoiceFromTemplate(template.id, {
          generateDate: template.nextGenerationDate
        })

        if (invoice) {
          invoices.push(invoice)
          generated++

          // Send notifications if enabled
          if (template.notifyParty) {
            // Send WhatsApp/email to party
            // await notifyParty(invoice)
          }

          if (template.notifyAdmin) {
            // Notify admin
            // await notifyAdmin(invoice, template)
          }
        } else {
          failed++
        }
      } catch (error) {
        console.error(`Failed to generate from template ${template.id}:`, error)
        failed++
      }
    }
  }

  return { generated, failed, invoices }
}

/**
 * Calculate next generation date based on frequency
 */
function calculateNextGenerationDate(template: RecurringInvoiceTemplate): string {
  const current = new Date(template.nextGenerationDate)

  switch (template.frequency) {
    case 'daily':
      current.setDate(current.getDate() + 1)
      break
    case 'weekly':
      current.setDate(current.getDate() + 7)
      break
    case 'monthly':
      current.setMonth(current.getMonth() + 1)
      break
    case 'quarterly':
      current.setMonth(current.getMonth() + 3)
      break
    case 'yearly':
      current.setFullYear(current.getFullYear() + 1)
      break
  }

  return current.toISOString().split('T')[0]
}

/**
 * Calculate due date
 */
function calculateDueDate(invoiceDate: string, daysUntilDue: number): string {
  const date = new Date(invoiceDate)
  date.setDate(date.getDate() + daysUntilDue)
  return date.toISOString().split('T')[0]
}

/**
 * Generate invoice number from template
 */
function generateInvoiceNumber(template: RecurringInvoiceTemplate, date: string): string {
  const prefix = template.type === 'sale' ? 'REC-INV' : 'REC-BILL'
  const dateStr = date.replace(/-/g, '')
  const count = (template.totalGenerated + 1).toString().padStart(4, '0')
  return `${prefix}-${dateStr}-${count}`
}

/**
 * Track generated invoice
 */
function trackGeneratedInvoice(templateId: string, invoiceId: string, date: string): void {
  try {
    const stored = localStorage.getItem(GENERATED_INVOICES_KEY)
    const history: Array<{ templateId: string; invoiceId: string; date: string }> = stored
      ? JSON.parse(stored)
      : []

    history.push({ templateId, invoiceId, date })

    // Keep only last 1000 records
    if (history.length > 1000) {
      history.splice(0, history.length - 1000)
    }

    localStorage.setItem(GENERATED_INVOICES_KEY, JSON.stringify(history))
  } catch (error) {
    console.error('Error tracking generated invoice:', error)
  }
}

/**
 * Get invoices generated from a template
 */
export function getGeneratedInvoices(templateId: string): string[] {
  try {
    const stored = localStorage.getItem(GENERATED_INVOICES_KEY)
    if (stored) {
      const history: Array<{ templateId: string; invoiceId: string; date: string }> =
        JSON.parse(stored)
      return history.filter(h => h.templateId === templateId).map(h => h.invoiceId)
    }
  } catch (error) {
    console.error('Error reading generated invoices:', error)
  }
  return []
}

/**
 * Initialize recurring invoice checker (call on app startup)
 */
export function initializeRecurringInvoiceChecker(): void {
  // Run check immediately
  checkAndGenerateRecurringInvoices()

  // Schedule daily checks at midnight
  const now = new Date()
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const timeUntilMidnight = tomorrow.getTime() - now.getTime()

  setTimeout(() => {
    checkAndGenerateRecurringInvoices()

    // Then run every 24 hours
    setInterval(() => {
      checkAndGenerateRecurringInvoices()
    }, 24 * 60 * 60 * 1000)
  }, timeUntilMidnight)
}
