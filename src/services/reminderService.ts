// Payment Reminder Service - Auto-send reminders for overdue payments
import { getInvoices, type Invoice } from './invoiceService'
import { sendPaymentReminderWhatsApp } from './shareService'

export interface ReminderConfig {
  enabled: boolean
  checkFrequency: 'daily' | 'weekly'
  reminderDays: number[] // Days after due date to send reminders (e.g., [3, 7, 15, 30])
  whatsappEnabled: boolean
  emailEnabled: boolean
  autoSend: boolean // If false, only creates pending reminders for manual review
}

export interface PendingReminder {
  id: string
  invoiceId: string
  invoiceNumber: string
  partyId: string
  partyName: string
  partyPhone?: string
  partyEmail?: string
  amount: number
  balanceDue: number
  dueDate: string
  daysPastDue: number
  reminderType: 'whatsapp' | 'email' | 'both'
  status: 'pending' | 'sent' | 'failed'
  scheduledDate: string
  sentDate?: string
  lastReminderDate?: string
  reminderCount: number
  createdAt: string
}

const LOCAL_STORAGE_KEY_CONFIG = 'thisai_crm_reminder_config'
const LOCAL_STORAGE_KEY_REMINDERS = 'thisai_crm_pending_reminders'
const LOCAL_STORAGE_KEY_HISTORY = 'thisai_crm_reminder_history'

/**
 * Get reminder configuration
 */
export function getReminderConfig(): ReminderConfig {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_CONFIG)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Error reading reminder config:', error)
  }

  // Default configuration
  return {
    enabled: false,
    checkFrequency: 'daily',
    reminderDays: [3, 7, 15, 30], // Send reminders 3, 7, 15, 30 days after due
    whatsappEnabled: true,
    emailEnabled: false,
    autoSend: false // Manual approval by default for safety
  }
}

/**
 * Save reminder configuration
 */
export function saveReminderConfig(config: ReminderConfig): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_CONFIG, JSON.stringify(config))
}

/**
 * Check for overdue invoices and create pending reminders
 */
export async function checkAndCreateReminders(): Promise<PendingReminder[]> {
  const config = getReminderConfig()

  if (!config.enabled) {
    return []
  }

  const allInvoices = await getInvoices()
  const today = new Date()
  const newReminders: PendingReminder[] = []

  // Get existing reminders to avoid duplicates
  const existingReminders = getPendingReminders()
  const existingReminderMap = new Map(
    existingReminders.map(r => [`${r.invoiceId}-${r.scheduledDate}`, r])
  )

  // Filter overdue invoices
  const overdueInvoices = allInvoices.filter(inv => {
    const balanceDue = inv.grandTotal - (inv.payment?.paidAmount || 0)
    if (balanceDue <= 0) return false // Fully paid

    const dueDate = inv.dueDate || inv.invoiceDate
    const daysPastDue = Math.floor(
      (today.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    return daysPastDue > 0 // Overdue
  })

  // Create reminders for each overdue invoice
  overdueInvoices.forEach(invoice => {
    const dueDate = invoice.dueDate || invoice.invoiceDate
    const daysPastDue = Math.floor(
      (today.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    const balanceDue = invoice.grandTotal - (invoice.payment?.paidAmount || 0)

    // Check if we should send a reminder based on configured days
    const shouldSendReminder = config.reminderDays.some(days => days === daysPastDue)

    if (shouldSendReminder) {
      const scheduledDate = today.toISOString().split('T')[0]
      const key = `${invoice.id}-${scheduledDate}`

      // Skip if reminder already exists for today
      if (existingReminderMap.has(key)) {
        return
      }

      // Count previous reminders for this invoice
      const previousReminders = existingReminders.filter(r => r.invoiceId === invoice.id)
      const lastReminder = previousReminders[previousReminders.length - 1]

      const reminder: PendingReminder = {
        id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        partyId: invoice.partyId || 'unknown',
        partyName: invoice.partyName,
        partyPhone: invoice.partyPhone,
        partyEmail: invoice.partyEmail,
        amount: invoice.grandTotal,
        balanceDue: balanceDue,
        dueDate: dueDate,
        daysPastDue: daysPastDue,
        reminderType: config.whatsappEnabled && config.emailEnabled
          ? 'both'
          : config.whatsappEnabled
          ? 'whatsapp'
          : 'email',
        status: 'pending',
        scheduledDate: scheduledDate,
        lastReminderDate: lastReminder?.sentDate,
        reminderCount: previousReminders.filter(r => r.status === 'sent').length,
        createdAt: new Date().toISOString()
      }

      newReminders.push(reminder)
    }
  })

  // Save new reminders
  if (newReminders.length > 0) {
    const allReminders = [...existingReminders, ...newReminders]
    localStorage.setItem(LOCAL_STORAGE_KEY_REMINDERS, JSON.stringify(allReminders))

    // Auto-send if configured
    if (config.autoSend) {
      await sendPendingReminders(newReminders)
    }
  }

  return newReminders
}

/**
 * Get all pending reminders
 */
export function getPendingReminders(): PendingReminder[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_REMINDERS)
    if (stored) {
      const reminders: PendingReminder[] = JSON.parse(stored)
      // Filter out old sent/failed reminders (keep only last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return reminders.filter(r =>
        r.status === 'pending' ||
        new Date(r.createdAt) > thirtyDaysAgo
      )
    }
  } catch (error) {
    console.error('Error reading pending reminders:', error)
  }
  return []
}

/**
 * Send pending reminders
 */
export async function sendPendingReminders(
  reminders?: PendingReminder[]
): Promise<{ sent: number; failed: number }> {
  const toSend = reminders || getPendingReminders().filter(r => r.status === 'pending')
  const config = getReminderConfig()

  let sent = 0
  let failed = 0

  for (const reminder of toSend) {
    try {
      // Send WhatsApp reminder
      if (config.whatsappEnabled && reminder.partyPhone) {
        // Get company name from localStorage
        const companySettings = JSON.parse(localStorage.getItem('appSettings') || '{}')
        const companyName = companySettings.company?.businessName || 'Your Business'

        sendPaymentReminderWhatsApp(
          reminder.partyPhone,
          reminder.partyName,
          reminder.invoiceNumber,
          reminder.balanceDue,
          reminder.dueDate,
          companyName
        )
      }

      // Send Email reminder (if email service is configured)
      if (config.emailEnabled && reminder.partyEmail) {
        // Email sending would go here
        // await sendReminderEmail(reminder)
      }

      // Mark as sent
      reminder.status = 'sent'
      reminder.sentDate = new Date().toISOString()
      sent++

      // Add to history
      addReminderToHistory(reminder)
    } catch (error) {
      console.error(`Failed to send reminder ${reminder.id}:`, error)
      reminder.status = 'failed'
      failed++
    }
  }

  // Update stored reminders
  const allReminders = getPendingReminders()
  localStorage.setItem(LOCAL_STORAGE_KEY_REMINDERS, JSON.stringify(allReminders))

  return { sent, failed }
}

/**
 * Generate reminder message
 */
function generateReminderMessage(reminder: PendingReminder): string {
  return `Dear ${reminder.partyName},

This is a friendly reminder that Invoice ${reminder.invoiceNumber} is overdue by ${reminder.daysPastDue} days.

Invoice Amount: ₹${reminder.amount.toLocaleString('en-IN')}
Balance Due: ₹${reminder.balanceDue.toLocaleString('en-IN')}
Due Date: ${new Date(reminder.dueDate).toLocaleDateString()}

Please make the payment at your earliest convenience.

Thank you!`
}

/**
 * Add reminder to history
 */
function addReminderToHistory(reminder: PendingReminder): void {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_HISTORY)
    const history: PendingReminder[] = stored ? JSON.parse(stored) : []

    // Keep only last 100 reminders
    if (history.length >= 100) {
      history.shift()
    }

    history.push(reminder)
    localStorage.setItem(LOCAL_STORAGE_KEY_HISTORY, JSON.stringify(history))
  } catch (error) {
    console.error('Error saving reminder history:', error)
  }
}

/**
 * Get reminder history
 */
export function getReminderHistory(limit: number = 50): PendingReminder[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY_HISTORY)
    if (stored) {
      const history: PendingReminder[] = JSON.parse(stored)
      return history.slice(-limit).reverse()
    }
  } catch (error) {
    console.error('Error reading reminder history:', error)
  }
  return []
}

/**
 * Delete a pending reminder
 */
export function deletePendingReminder(reminderId: string): void {
  const reminders = getPendingReminders().filter(r => r.id !== reminderId)
  localStorage.setItem(LOCAL_STORAGE_KEY_REMINDERS, JSON.stringify(reminders))
}

/**
 * Initialize reminder checker (call this on app startup)
 */
export function initializeReminderChecker(): void {
  const config = getReminderConfig()

  if (!config.enabled) {
    return
  }

  // Run check immediately
  checkAndCreateReminders()

  // Schedule periodic checks
  const intervalMs = config.checkFrequency === 'daily'
    ? 24 * 60 * 60 * 1000 // 24 hours
    : 7 * 24 * 60 * 60 * 1000 // 7 days

  setInterval(() => {
    checkAndCreateReminders()
  }, intervalMs)
}
