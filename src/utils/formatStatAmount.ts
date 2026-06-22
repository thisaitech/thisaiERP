export function formatStatAmount(value: number): string {
  const safe = Number.isFinite(value) ? Math.abs(value) : 0
  if (safe >= 10000000) return `₹${(safe / 10000000).toFixed(1)} Cr`
  if (safe >= 100000) return `₹${(safe / 100000).toFixed(1)} L`
  if (safe >= 1000) return `₹${(safe / 1000).toFixed(1)} K`
  return `₹${safe.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatStatCount(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  return safe.toLocaleString('en-IN')
}
