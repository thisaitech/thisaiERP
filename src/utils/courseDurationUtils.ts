const DURATION_DAYS: Record<string, number> = {
  '1 Week': 7,
  '2 Weeks': 14,
  '1 Month': 30,
  '45 Days': 45,
  '2 Months': 60,
  '3 Months': 90,
  '6 Months': 180,
  '1 Year': 365,
  '2 Years': 730,
  '3 Years': 1095,
  'Or More': 365,
}

function parseLocalDate(dateInput: string): Date | null {
  if (!dateInput) return null
  const trimmed = dateInput.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getDurationDays(duration: string | undefined): number | null {
  if (!duration) return null
  const normalized = duration.trim()
  if (DURATION_DAYS[normalized] != null) return DURATION_DAYS[normalized]
  const match = normalized.match(/^(\d+)\s*(day|days|week|weeks|month|months|year|years)$/i)
  if (!match) return null
  const amount = Number(match[1])
  const unit = match[2].toLowerCase()
  if (unit.startsWith('day')) return amount
  if (unit.startsWith('week')) return amount * 7
  if (unit.startsWith('month')) return amount * 30
  if (unit.startsWith('year')) return amount * 365
  return null
}

export function parseAdmissionDate(dateInput: string): Date | null {
  return parseLocalDate(dateInput)
}

export function computeCourseEndDate(startDate: string, duration: string | undefined): Date | null {
  const start = parseLocalDate(startDate)
  const days = getDurationDays(duration)
  if (!start || days == null) return null
  const end = new Date(start)
  end.setDate(end.getDate() + days)
  return end
}

export function daysUntilDate(targetDate: Date, fromDate: Date = new Date()): number {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
