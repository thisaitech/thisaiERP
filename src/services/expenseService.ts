// Expense Service (REST backend)

import { apiDelete, apiGet, apiPost } from './apiClient'

export interface Expense {
  id: string
  expenseNumber: string
  date: string
  category: 'rent' | 'salary' | 'utilities' | 'marketing' | 'office_supplies' | 'travel' | 'food' | 'internet' | 'software' | 'other'
  subcategory?: string
  amount: number
  paymentMode: 'cash' | 'bank' | 'card' | 'upi' | 'cheque'
  vendor?: string
  vendorGSTIN?: string
  description: string
  billNumber?: string
  billDate?: string
  gstAmount?: number
  status: 'pending' | 'paid' | 'reimbursed'
  reimbursableToEmployee?: string
  attachments?: string[]
  notes?: string
  createdAt: string
  createdBy: string
  isRecurring?: boolean
  recurringType?: 'monthly' | 'quarterly' | 'yearly' | 'one-time'
  monthlyAmount?: number
  dailyRate?: number
}

type ListResponse<T> = { data: T[] }
type OneResponse<T> = { data: T }

export function generateExpenseNumber(prefix: string = 'EXP'): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${yy}${mm}-${rand}`
}

export async function getExpenses(): Promise<Expense[]> {
  const res = await apiGet<ListResponse<Expense>>('/expenses')
  const rows = res.data || []
  rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  return rows
}

export async function createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense | null> {
  const now = new Date().toISOString()
  const payload: any = {
    ...expense,
    expenseNumber: (expense as any).expenseNumber || generateExpenseNumber(),
    createdAt: now,
  }
  const res = await apiPost<OneResponse<Expense>>('/expenses', payload)
  return res.data
}

export async function deleteExpense(id: string): Promise<boolean> {
  await apiDelete<{ ok: boolean }>(`/expenses/${encodeURIComponent(id)}`)
  return true
}

// Used by reportService for prorated P&L.
function parseYmd(date: string): Date | null {
  if (!date || typeof date !== 'string') return null
  // Accept YYYY-MM-DD, otherwise Date() will handle ISO strings.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date)
  return Number.isNaN(d.getTime()) ? null : d
}

function clampDate(d: Date, min: Date, max: Date): Date {
  if (d < min) return min
  if (d > max) return max
  return d
}

function daysBetweenInclusive(a: Date, b: Date): number {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000)
  return diff + 1
}

export function calculateProratedAmount(expense: Expense, startDate: string, endDate: string): number {
  const start = parseYmd(startDate)
  const end = parseYmd(endDate)
  if (!start || !end) return 0
  if (end < start) return 0

  const expDate = parseYmd(expense.date)

  // Non-recurring (one-time) expenses count only if they fall inside the period.
  if (!expense.isRecurring || expense.recurringType === 'one-time') {
    if (!expDate) return 0
    return expDate >= start && expDate <= end ? (Number(expense.amount) || 0) : 0
  }

  // Recurring expenses apply over the period, optionally starting from the expense.date.
  const recurringStart = expDate || start
  const rangeStart = recurringStart > start ? recurringStart : start
  if (rangeStart > end) return 0

  const dailyRate = typeof expense.dailyRate === 'number' && Number.isFinite(expense.dailyRate) ? expense.dailyRate : null
  if (dailyRate && dailyRate > 0) {
    return Math.round(daysBetweenInclusive(rangeStart, end) * dailyRate * 100) / 100
  }

  const recurringType = expense.recurringType || 'monthly'
  const baseAmount = typeof expense.monthlyAmount === 'number' && Number.isFinite(expense.monthlyAmount)
    ? expense.monthlyAmount
    : (Number(expense.amount) || 0)

  const monthlyAmount = (() => {
    if (baseAmount <= 0) return 0
    if (recurringType === 'yearly') return baseAmount / 12
    if (recurringType === 'quarterly') return baseAmount / 3
    return baseAmount // monthly
  })()

  if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) return 0

  // Sum month-by-month proration for accuracy if range spans multiple months.
  let total = 0
  let monthCursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1)
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)

  while (monthCursor <= endMonth) {
    const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
    const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0)
    const overlapStart = clampDate(rangeStart, monthStart, monthEnd)
    const overlapEnd = clampDate(end, monthStart, monthEnd)

    if (overlapEnd >= overlapStart) {
      const daysInMonth = monthEnd.getDate()
      const overlapDays = daysBetweenInclusive(overlapStart, overlapEnd)
      total += monthlyAmount * (overlapDays / daysInMonth)
    }

    monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)
  }

  return Math.round(total * 100) / 100
}
