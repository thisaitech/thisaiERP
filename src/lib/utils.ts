import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Get currency settings from localStorage
function getCurrencySettings(): { currency: string; locale: string; symbol: string } {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      const settings = JSON.parse(stored)
      const currency = settings.general?.currency || 'INR'
      const symbol = settings.general?.currencySymbol || (currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€')
      const locale = currency === 'INR' ? 'en-IN' : currency === 'USD' ? 'en-US' : 'en-EU'
      return { currency, locale, symbol }
    }
  } catch (error) {
    console.error('Error reading currency settings:', error)
  }
  return { currency: 'INR', locale: 'en-IN', symbol: '₹' }
}

// Get just the currency symbol (for use in templates)
export function getCurrencySymbol(): string {
  const { symbol } = getCurrencySettings()
  return symbol
}

// Get date format settings from localStorage
function getDateSettings(): { dateFormat: string; timeFormat: string } {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      const settings = JSON.parse(stored)
      return {
        dateFormat: settings.general?.dateFormat || 'DD/MM/YYYY',
        timeFormat: settings.general?.timeFormat || '12'
      }
    }
  } catch (error) {
    console.error('Error reading date settings:', error)
  }
  return { dateFormat: 'DD/MM/YYYY', timeFormat: '12' }
}

export function formatCurrency(amount: number): string {
  const { currency, locale } = getCurrencySettings()
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const { dateFormat } = getDateSettings()
  const d = new Date(date)

  const day = d.getDate().toString().padStart(2, '0')
  const month = d.toLocaleString('en', { month: 'short' })
  const monthNum = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()

  switch (dateFormat) {
    case 'MM/DD/YYYY':
      return `${monthNum}/${day}/${year}`
    case 'YYYY-MM-DD':
      return `${year}-${monthNum}-${day}`
    case 'DD/MM/YYYY':
    default:
      return `${day} ${month} ${year}`
  }
}

export function formatDateTime(date: string | Date): string {
  const { timeFormat } = getDateSettings()
  const d = new Date(date)

  const dateStr = formatDate(date)

  let hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')

  if (timeFormat === '12') {
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 // 0 should be 12
    return `${dateStr}, ${hours}:${minutes} ${ampm}`
  } else {
    return `${dateStr}, ${hours.toString().padStart(2, '0')}:${minutes}`
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function generateInvoiceNumber(type: 'sale' | 'purchase'): string {
  const prefix = type === 'sale' ? 'INV' : 'BILL'
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  return `${prefix}-${timestamp}-${random}`
}
