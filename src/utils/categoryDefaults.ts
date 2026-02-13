// Course Category Defaults for Unit Conversion
// Auto-fills alternate unit and units per batch when category is selected

export interface CategoryDefault {
  category: string
  alternateUnit: string  // Box, Pack, Dozen, etc.
  piecesPerUnit: number  // How many pieces in one alternate unit
  description?: string   // Optional description
}

// Default category configurations
// Owner can customize these in Settings
export const CATEGORY_DEFAULTS: CategoryDefault[] = [
  { category: 'Programming', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Web Development', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Data Science', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Accounting', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Office Tools', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Design', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Marketing', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Hardware & Networking', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Language', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Soft Skills', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Test Prep', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'General', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
  { category: 'Other', alternateUnit: 'Batch', piecesPerUnit: 1, description: '1 Batch = 1 Cohort' },
]

// Local storage key for custom category defaults
const CUSTOM_DEFAULTS_KEY = 'thisai_crm_category_defaults'

/**
 * Get all category defaults (custom + predefined)
 */
export function getCategoryDefaults(): CategoryDefault[] {
  try {
    const customDefaults = localStorage.getItem(CUSTOM_DEFAULTS_KEY)
    if (customDefaults) {
      const parsed = JSON.parse(customDefaults) as CategoryDefault[]
      // Merge custom with predefined, custom takes precedence
      const mergedMap = new Map<string, CategoryDefault>()

      // Add predefined first
      CATEGORY_DEFAULTS.forEach(d => mergedMap.set(d.category.toLowerCase(), d))

      // Override with custom
      parsed.forEach(d => mergedMap.set(d.category.toLowerCase(), d))

      return Array.from(mergedMap.values())
    }
  } catch (error) {
    console.error('Error loading custom category defaults:', error)
  }
  return CATEGORY_DEFAULTS
}

/**
 * Get default for a specific category
 */
export function getCategoryDefault(category: string): CategoryDefault | null {
  const defaults = getCategoryDefaults()
  const found = defaults.find(d => d.category.toLowerCase() === category.toLowerCase())

  if (found) return found

  // Return "General" default if category not found
  return defaults.find(d => d.category === 'General') || null
}

/**
 * Save custom category default (owner can override)
 */
export function saveCategoryDefault(categoryDefault: CategoryDefault): boolean {
  try {
    const customDefaults = localStorage.getItem(CUSTOM_DEFAULTS_KEY)
    let defaults: CategoryDefault[] = []

    if (customDefaults) {
      defaults = JSON.parse(customDefaults)
    }

    // Find and update or add new
    const existingIndex = defaults.findIndex(
      d => d.category.toLowerCase() === categoryDefault.category.toLowerCase()
    )

    if (existingIndex >= 0) {
      defaults[existingIndex] = categoryDefault
    } else {
      defaults.push(categoryDefault)
    }

    localStorage.setItem(CUSTOM_DEFAULTS_KEY, JSON.stringify(defaults))
    return true
  } catch (error) {
    console.error('Error saving category default:', error)
    return false
  }
}

/**
 * Get all unique category names
 */
export function getAllCategories(): string[] {
  const defaults = getCategoryDefaults()
  return defaults.map(d => d.category).sort()
}

/**
 * Calculate alternate unit price from base unit price
 * e.g., MRP per piece = ₹40, pieces per box = 12 → Box price = ₹480
 */
export function calculateAlternateUnitPrice(
  basePrice: number,
  piecesPerUnit: number
): number {
  return basePrice * piecesPerUnit
}

/**
 * Calculate base unit price from alternate unit price
 * e.g., Box price = ₹480, pieces per box = 12 → MRP per piece = ₹40
 */
export function calculateBaseUnitPrice(
  alternatePrice: number,
  piecesPerUnit: number
): number {
  if (piecesPerUnit <= 0) return alternatePrice
  return alternatePrice / piecesPerUnit
}

/**
 * Convert quantity from alternate unit to base unit (pieces)
 * e.g., 10 boxes × 12 pieces/box = 120 pieces
 */
export function convertToBaseQuantity(
  alternateQty: number,
  piecesPerUnit: number
): number {
  return alternateQty * piecesPerUnit
}

/**
 * Convert quantity from base unit (pieces) to display format
 * e.g., 98 pieces with 4 per pack → "24 Packs + 2 Loose"
 */
export function formatStockDisplay(
  totalPieces: number,
  piecesPerUnit: number,
  alternateUnit: string,
  baseUnit: string = 'Pcs'
): { fullUnits: number; loosePieces: number; displayText: string } {
  if (piecesPerUnit <= 1) {
    return {
      fullUnits: 0,
      loosePieces: totalPieces,
      displayText: `${totalPieces} ${baseUnit}`
    }
  }

  const fullUnits = Math.floor(totalPieces / piecesPerUnit)
  const loosePieces = totalPieces % piecesPerUnit

  let displayText = ''
  if (fullUnits > 0) {
    displayText = `${fullUnits} ${alternateUnit}${fullUnits > 1 ? 's' : ''}`
  }
  if (loosePieces > 0) {
    displayText += (displayText ? ' + ' : '') + `${loosePieces} Loose`
  }
  if (!displayText) {
    displayText = `0 ${baseUnit}`
  }

  return { fullUnits, loosePieces, displayText }
}
