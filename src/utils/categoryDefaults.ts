// Category Defaults for Unit Conversion
// Auto-fills alternate unit and pieces per unit when category is selected
// Vyapar 2025 Standard - Zero confusion for staff

export interface CategoryDefault {
  category: string
  alternateUnit: string  // Box, Pack, Dozen, etc.
  piecesPerUnit: number  // How many pieces in one alternate unit
  description?: string   // Optional description
}

// Default category configurations
// Owner can customize these in Settings
export const CATEGORY_DEFAULTS: CategoryDefault[] = [
  // Food & Beverages
  { category: 'Biscuits', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Packets' },
  { category: 'Chips', alternateUnit: 'Box', piecesPerUnit: 24, description: '1 Box = 24 Packets' },
  { category: 'Chocolate', alternateUnit: 'Box', piecesPerUnit: 24, description: '1 Box = 24 Pieces' },
  { category: 'Soft Drinks', alternateUnit: 'Crate', piecesPerUnit: 24, description: '1 Crate = 24 Bottles' },
  { category: 'Juice', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Packs' },
  { category: 'Water Bottles', alternateUnit: 'Case', piecesPerUnit: 24, description: '1 Case = 24 Bottles' },
  { category: 'Noodles', alternateUnit: 'Box', piecesPerUnit: 30, description: '1 Box = 30 Packets' },
  { category: 'Pasta', alternateUnit: 'Box', piecesPerUnit: 10, description: '1 Box = 10 Packets' },
  { category: 'Rice', alternateUnit: 'Bag', piecesPerUnit: 10, description: '1 Bag = 10 Kg Packets' },
  { category: 'Oil', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Litres' },
  { category: 'Milk', alternateUnit: 'Crate', piecesPerUnit: 20, description: '1 Crate = 20 Packets' },
  { category: 'Tea', alternateUnit: 'Box', piecesPerUnit: 24, description: '1 Box = 24 Packets' },
  { category: 'Coffee', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Sachets' },

  // Personal Care
  { category: 'Soap', alternateUnit: 'Pack', piecesPerUnit: 4, description: '1 Pack = 4 Bars' },
  { category: 'Shampoo', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Bottles' },
  { category: 'Toothpaste', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Tubes' },
  { category: 'Cream', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Tubes' },
  { category: 'Detergent', alternateUnit: 'Box', piecesPerUnit: 6, description: '1 Box = 6 Packs' },
  { category: 'Sanitizer', alternateUnit: 'Box', piecesPerUnit: 24, description: '1 Box = 24 Bottles' },

  // Stationery
  { category: 'Stationery', alternateUnit: 'Box', piecesPerUnit: 10, description: '1 Box = 10 Pieces' },
  { category: 'Pens', alternateUnit: 'Box', piecesPerUnit: 10, description: '1 Box = 10 Pens' },
  { category: 'Notebooks', alternateUnit: 'Pack', piecesPerUnit: 6, description: '1 Pack = 6 Books' },
  { category: 'Pencils', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Pencils' },

  // Electronics
  { category: 'Batteries', alternateUnit: 'Pack', piecesPerUnit: 4, description: '1 Pack = 4 Batteries' },
  { category: 'Bulbs', alternateUnit: 'Box', piecesPerUnit: 10, description: '1 Box = 10 Bulbs' },

  // Medicine/Health
  { category: 'Tablets', alternateUnit: 'Strip', piecesPerUnit: 10, description: '1 Strip = 10 Tablets' },
  { category: 'Syrup', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Bottles' },

  // General
  { category: 'General', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Pieces' },
  { category: 'Other', alternateUnit: 'Box', piecesPerUnit: 12, description: '1 Box = 12 Pieces' },
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
