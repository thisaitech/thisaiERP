import { getInvoices } from './invoiceService'
import { getVisitors } from './visitorService'
import { getItems } from './itemService'
import { getExpenses } from './expenseService'
import {
  generateAllNotifications,
  type ErpNotification,
  type NotificationCategory,
} from '../utils/notificationGenerators'

const READ_KEY_PREFIX = 'erp_notification_read_'
const DISMISSED_KEY_PREFIX = 'erp_notification_dismissed_'

function storageKey(prefix: string, companyId: string, userId: string): string {
  return `${prefix}${companyId}_${userId}`
}

function readIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((id) => typeof id === 'string')) : new Set()
  } catch {
    return new Set()
  }
}

function writeIdSet(key: string, ids: Set<string>): void {
  localStorage.setItem(key, JSON.stringify(Array.from(ids)))
}

export function getReadNotificationIds(companyId: string, userId: string): Set<string> {
  return readIdSet(storageKey(READ_KEY_PREFIX, companyId, userId))
}

export function getDismissedNotificationIds(companyId: string, userId: string): Set<string> {
  return readIdSet(storageKey(DISMISSED_KEY_PREFIX, companyId, userId))
}

export function markNotificationRead(companyId: string, userId: string, notificationId: string): void {
  const key = storageKey(READ_KEY_PREFIX, companyId, userId)
  const ids = readIdSet(key)
  ids.add(notificationId)
  writeIdSet(key, ids)
}

export function markAllNotificationsRead(companyId: string, userId: string, notificationIds: string[]): void {
  const key = storageKey(READ_KEY_PREFIX, companyId, userId)
  const ids = readIdSet(key)
  notificationIds.forEach((id) => ids.add(id))
  writeIdSet(key, ids)
}

export function dismissNotification(companyId: string, userId: string, notificationId: string): void {
  const key = storageKey(DISMISSED_KEY_PREFIX, companyId, userId)
  const ids = readIdSet(key)
  ids.add(notificationId)
  writeIdSet(key, ids)
  markNotificationRead(companyId, userId, notificationId)
}

function toLocalDateKey(value: string | Date | undefined): string {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function sumInRange(records: any[], start: Date, end: Date, amountField: string): number {
  const startKey = toLocalDateKey(start)
  const endKey = toLocalDateKey(end)
  return records.reduce((sum, record) => {
    const key = toLocalDateKey(record.invoiceDate || record.date || record.createdAt)
    if (!key || key < startKey || key > endKey) return sum
    return sum + Number(record[amountField] || record.grandTotal || record.total || 0)
  }, 0)
}

async function computeProfitMetrics() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const [sales, purchases, expenses] = await Promise.all([
    getInvoices('sale'),
    getInvoices('purchase'),
    getExpenses(),
  ])

  const salesMonth = sumInRange(sales, monthStart, now, 'grandTotal')
  const purchasesMonth = sumInRange(purchases, monthStart, now, 'grandTotal')
  const expensesMonth = expenses
    .filter((expense) => {
      const key = toLocalDateKey(expense.date || expense.createdAt)
      const startKey = toLocalDateKey(monthStart)
      const endKey = toLocalDateKey(now)
      return key >= startKey && key <= endKey
    })
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)

  const profitMonth = salesMonth - purchasesMonth - expensesMonth

  const prevSales = sumInRange(sales, prevMonthStart, prevMonthEnd, 'grandTotal')
  const prevPurchases = sumInRange(purchases, prevMonthStart, prevMonthEnd, 'grandTotal')
  const prevExpenses = expenses
    .filter((expense) => {
      const key = toLocalDateKey(expense.date || expense.createdAt)
      const startKey = toLocalDateKey(prevMonthStart)
      const endKey = toLocalDateKey(prevMonthEnd)
      return key >= startKey && key <= endKey
    })
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  const prevProfit = prevSales - prevPurchases - prevExpenses
  const profitGrowth = prevProfit !== 0 ? ((profitMonth - prevProfit) / Math.abs(prevProfit)) * 100 : 0

  return { salesMonth, profitMonth, profitGrowth }
}

export async function fetchErpNotifications(): Promise<ErpNotification[]> {
  const [saleInvoices, visitors, items, profitMetrics] = await Promise.all([
    getInvoices('sale'),
    getVisitors(),
    getItems(),
    computeProfitMetrics(),
  ])

  return generateAllNotifications({
    saleInvoices,
    visitors,
    items,
    profitMonth: profitMetrics.profitMonth,
    profitGrowth: profitMetrics.profitGrowth,
    salesMonth: profitMetrics.salesMonth,
  })
}

export function applyNotificationState(
  notifications: ErpNotification[],
  companyId: string,
  userId: string
): Array<ErpNotification & { isRead: boolean }> {
  const readIds = getReadNotificationIds(companyId, userId)
  const dismissedIds = getDismissedNotificationIds(companyId, userId)

  return notifications
    .filter((notification) => !dismissedIds.has(notification.id))
    .map((notification) => ({
      ...notification,
      isRead: readIds.has(notification.id),
    }))
}

export function groupNotificationsByCategory(
  notifications: Array<ErpNotification & { isRead: boolean }>
): Record<NotificationCategory, Array<ErpNotification & { isRead: boolean }>> {
  return notifications.reduce((groups, notification) => {
    if (!groups[notification.category]) groups[notification.category] = []
    groups[notification.category].push(notification)
    return groups
  }, {
    payments: [],
    admissions: [],
    visitors: [],
    profit: [],
    reports: [],
    inventory: [],
  } as Record<NotificationCategory, Array<ErpNotification & { isRead: boolean }>>)
}

export type { ErpNotification, NotificationCategory }
