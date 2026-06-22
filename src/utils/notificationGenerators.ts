import type { Invoice } from '../types'
import type { Visitor } from '../services/visitorService'
import { getLowStockItems } from './stockUtils'
import {
  computeCourseEndDate,
  daysUntilDate,
  formatDisplayDate,
  parseAdmissionDate,
} from './courseDurationUtils'

export type NotificationCategory =
  | 'payments'
  | 'admissions'
  | 'visitors'
  | 'inventory'
  | 'profit'
  | 'reports'

export type NotificationPriority = 'high' | 'medium' | 'low'

export interface ErpNotification {
  id: string
  category: NotificationCategory
  priority: NotificationPriority
  title: string
  message: string
  link?: string
  createdAt: string
}

export interface NotificationGeneratorInput {
  saleInvoices: Invoice[]
  visitors: Visitor[]
  profitMonth: number
  profitGrowth: number
  salesMonth: number
  items: Array<{ id?: string; name?: string; stock?: number; reorderPoint?: number; lowStockAlert?: number }>
}

function toDateKey(value: string | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function rupee(value: number): string {
  return `₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function getAdmissionJoinDate(invoice: Invoice): string {
  return toDateKey(invoice.invoiceDate || (invoice as any).date || invoice.createdAt)
}

function getAdmissionPendingAmount(invoice: Invoice): number {
  const total = Number(invoice.grandTotal || invoice.total || 0)
  const paid = Number((invoice as any).paidAmount || 0)
  return Math.max(total - paid, 0)
}

function getAdmissionLineItems(invoice: Invoice): any[] {
  return Array.isArray((invoice as any).items) ? (invoice as any).items : []
}

function formatDaysUntilCourseEnd(daysLeft: number): string {
  if (daysLeft === 0) return 'today'
  if (daysLeft === 1) return 'tomorrow'
  if (daysLeft === 7) return 'in 7 days'
  return `in ${daysLeft} days`
}

export function generatePaymentReminderNotifications(invoices: Invoice[]): ErpNotification[] {
  const now = new Date()
  const alerts: ErpNotification[] = []

  for (const invoice of invoices) {
    const pending = getAdmissionPendingAmount(invoice)
    if (pending <= 0) continue

    const joinDate = getAdmissionJoinDate(invoice)
    const studentName = invoice.partyName || 'Student'
    const phone = String((invoice as any).phone || '').trim()
    const items = getAdmissionLineItems(invoice)

    let soonestEnding: { daysLeft: number; endDate: Date; courseName: string } | null = null

    items.forEach((item) => {
      const endDate = computeCourseEndDate(joinDate, item.duration)
      if (!endDate) return

      const daysLeft = daysUntilDate(endDate, now)
      if (daysLeft < 0 || daysLeft > 7) return

      const courseName = item.itemName || item.name || 'Course'
      if (!soonestEnding || daysLeft < soonestEnding.daysLeft) {
        soonestEnding = { daysLeft, endDate, courseName }
      }
    })

    if (!soonestEnding) continue

    const { daysLeft, endDate, courseName } = soonestEnding
    const isSevenDayReminder = daysLeft === 7
    const priority: NotificationPriority = daysLeft <= 2 ? 'high' : isSevenDayReminder ? 'medium' : 'medium'

    const joinDateLabel = parseAdmissionDate(joinDate)
      ? formatDisplayDate(parseAdmissionDate(joinDate)!)
      : joinDate

    alerts.push({
      id: `payment-reminder-${invoice.id}`,
      category: 'payments',
      priority,
      title: isSevenDayReminder ? 'Payment reminder — 7 days left' : 'Payment due before course ends',
      message: `${studentName} has ${rupee(pending)} pending for ${courseName}. Course ends ${formatDaysUntilCourseEnd(daysLeft)} (${formatDisplayDate(endDate)}) from joining date ${joinDateLabel}.${phone ? ` Contact: ${phone}.` : ''}`,
      link: '/sales',
      createdAt: endDate.toISOString(),
    })
  }

  return alerts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function generateCourseExpiryNotifications(invoices: Invoice[]): ErpNotification[] {
  const now = new Date()
  const alerts: ErpNotification[] = []

  for (const invoice of invoices) {
    if (getAdmissionPendingAmount(invoice) > 0) continue

    const startDate = getAdmissionJoinDate(invoice)
    const studentName = invoice.partyName || 'Student'
    const items = getAdmissionLineItems(invoice)

    items.forEach((item: any, index: number) => {
      const endDate = computeCourseEndDate(startDate, item.duration)
      if (!endDate) return

      const daysLeft = daysUntilDate(endDate, now)
      if (daysLeft < 0 || daysLeft > 7) return

      const courseName = item.itemName || item.name || 'Course'
      const priority: NotificationPriority = daysLeft <= 2 ? 'high' : daysLeft <= 5 ? 'medium' : 'low'
      const dayLabel = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`

      alerts.push({
        id: `course-expiry-${invoice.id}-${index}`,
        category: 'admissions',
        priority,
        title: 'Course ending soon',
        message: `${studentName}'s ${courseName} ends ${dayLabel} (${formatDisplayDate(endDate)})`,
        link: '/sales',
        createdAt: endDate.toISOString(),
      })
    })
  }

  return alerts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function generateRecentAdmissionNotifications(invoices: Invoice[]): ErpNotification[] {
  const now = new Date()
  const threeDaysAgo = new Date(now)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  return invoices
    .filter((invoice) => {
      const createdAt = new Date(invoice.createdAt || invoice.invoiceDate || 0)
      return createdAt >= threeDaysAgo
    })
    .slice(0, 5)
    .map((invoice) => {
      const total = Number(invoice.grandTotal || invoice.total || 0)
      const paid = Number((invoice as any).paidAmount || 0)
      const pending = Math.max(total - paid, 0)
      return {
        id: `admission-new-${invoice.id}`,
        category: 'admissions' as const,
        priority: pending > 0 ? 'medium' : 'low',
        title: 'New admission',
        message: `${invoice.partyName || 'Student'} enrolled${pending > 0 ? ` — ${rupee(pending)} pending` : ''}`,
        link: '/sales',
        createdAt: invoice.createdAt || invoice.invoiceDate || now.toISOString(),
      }
    })
}

export function generateVisitorNotifications(visitors: Visitor[]): ErpNotification[] {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)

  return visitors
    .filter((visitor) => {
      const visitDate = new Date(visitor.visitDate || visitor.createdAt || 0)
      return visitDate >= weekAgo
    })
    .slice(0, 8)
    .map((visitor) => {
      const visitDate = visitor.visitDate || visitor.createdAt
      const isToday = toDateKey(visitDate) === toDateKey(now.toISOString())
      const enquiry = visitor.enquiryType === 'it' ? 'IT services' : 'training'
      return {
        id: `visitor-${visitor.id}`,
        category: 'visitors' as const,
        priority: isToday ? 'high' : 'medium',
        title: isToday ? 'Visitor today' : 'Recent visitor',
        message: `${visitor.name} enquired about ${visitor.course || enquiry}${visitor.phone ? ` (${visitor.phone})` : ''}`,
        link: '/visitors',
        createdAt: visitor.createdAt || visitDate,
      }
    })
}

export function generateProfitNotifications(
  profitMonth: number,
  profitGrowth: number,
  salesMonth: number
): ErpNotification[] {
  const notifications: ErpNotification[] = []
  const now = new Date()

  notifications.push({
    id: `profit-month-${now.getFullYear()}-${now.getMonth() + 1}`,
    category: 'profit',
    priority: profitMonth < 0 ? 'high' : 'medium',
    title: profitMonth < 0 ? 'Monthly loss alert' : 'Monthly profit summary',
    message: profitMonth < 0
      ? `Current month shows a loss of ${rupee(profitMonth)}. Review expenses and admissions.`
      : `This month's net profit is ${rupee(profitMonth)}${salesMonth > 0 ? ` on ${rupee(salesMonth)} admissions` : ''}.`,
    link: '/reports',
    createdAt: now.toISOString(),
  })

  if (Math.abs(profitGrowth) >= 10) {
    notifications.push({
      id: `profit-growth-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`,
      category: 'profit',
      priority: profitGrowth < -15 ? 'high' : 'low',
      title: profitGrowth >= 0 ? 'Profit trending up' : 'Profit decline',
      message: profitGrowth >= 0
        ? `Profit is up ${profitGrowth.toFixed(1)}% compared to the previous period.`
        : `Profit dropped ${Math.abs(profitGrowth).toFixed(1)}% compared to the previous period.`,
      link: '/reports',
      createdAt: now.toISOString(),
    })
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeftInMonth = daysInMonth - now.getDate()
  if (daysLeftInMonth <= 5) {
    notifications.push({
      id: `profit-report-due-${now.getFullYear()}-${now.getMonth() + 1}`,
      category: 'reports',
      priority: 'medium',
      title: 'Month-end report',
      message: `Financial month closes in ${daysLeftInMonth} day${daysLeftInMonth === 1 ? '' : 's'}. Review P&L and admissions.`,
      link: '/reports',
      createdAt: now.toISOString(),
    })
  }

  return notifications
}

export function generateInventoryNotifications(
  items: NotificationGeneratorInput['items']
): ErpNotification[] {
  const lowStock = getLowStockItems(items as any)
  if (lowStock.length === 0) return []

  return [{
    id: `inventory-low-stock-${lowStock.length}`,
    category: 'inventory',
    priority: lowStock.length >= 3 ? 'high' : 'medium',
    title: 'Low course seats',
    message: `${lowStock.length} course${lowStock.length === 1 ? '' : 's'} need seat replenishment soon.`,
    link: '/inventory?filter=low-stock',
    createdAt: new Date().toISOString(),
  }]
}

export function generateAllNotifications(input: NotificationGeneratorInput): ErpNotification[] {
  const notifications = [
    ...generatePaymentReminderNotifications(input.saleInvoices),
    ...generateCourseExpiryNotifications(input.saleInvoices),
    ...generateRecentAdmissionNotifications(input.saleInvoices),
    ...generateVisitorNotifications(input.visitors),
    ...generateProfitNotifications(input.profitMonth, input.profitGrowth, input.salesMonth),
    ...generateInventoryNotifications(input.items),
  ]

  const priorityRank: Record<NotificationPriority, number> = { high: 0, medium: 1, low: 2 }
  return notifications.sort((a, b) => {
    const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority]
    if (priorityDiff !== 0) return priorityDiff
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  payments: 'Students/Payments',
  admissions: 'Admissions',
  visitors: 'Visitors',
  inventory: 'Inventory',
  profit: 'Profit',
  reports: 'Reports',
}

export const NOTIFICATION_CATEGORY_ORDER: NotificationCategory[] = [
  'payments',
  'admissions',
  'visitors',
  'inventory',
  'profit',
  'reports',
]
