/**
 * Item Master Service - Intelligent Auto-Fill System
 * Provides search, autocomplete, and auto-fill functionality
 * for adding items with pre-populated data
 */

import { ITEM_MASTER, MasterItem, searchMasterItems, findBestMatch } from '../data/itemMaster'

/**
 * Get all available categories from master database
 */
export function getAllCategories(): string[] {
  const categories = new Set(ITEM_MASTER.map(item => item.category))
  return Array.from(categories).sort()
}

/**
 * Get all available units from master database
 */
export function getAllUnits(): string[] {
  const units = new Set(ITEM_MASTER.map(item => item.unit))
  return Array.from(units).sort()
}

/**
 * Search items with intelligent matching
 * Returns up to 10 best matches
 */
export function searchItems(query: string): MasterItem[] {
  return searchMasterItems(query)
}

/**
 * Get item by exact name match
 */
export function getItemByName(name: string): MasterItem | null {
  const normalized = name.toLowerCase().trim()
  return ITEM_MASTER.find(item => item.name.toLowerCase() === normalized) || null
}

/**
 * Auto-fill item data from master database
 * Returns complete item data ready to be added
 */
export function autoFillItem(searchTerm: string): MasterItem | null {
  return findBestMatch(searchTerm)
}

/**
 * Get suggested HSN code based on category
 */
export function suggestHSNCode(category: string): string {
  const item = ITEM_MASTER.find(i => i.category === category)
  return item?.hsn || ''
}

/**
 * Get suggested GST rate based on category
 */
export function suggestGSTRate(category: string): number {
  const item = ITEM_MASTER.find(i => i.category === category)
  return item?.gst_rate || 18
}

/**
 * Calculate suggested purchase price from MRP
 * Default margin: 10-15% depending on category
 */
export function calculatePurchasePrice(mrp: number, category?: string): number {
  // Different margins for different categories
  const margins: { [key: string]: number } = {
    'Dairy & Milk Products': 0.90, // 10% margin
    'FMCG': 0.85, // 15% margin
    'Electronics': 0.75, // 25% margin
    'Medicines & Health': 0.80, // 20% margin
    'default': 0.85 // 15% default margin
  }

  const margin = category ? (margins[category] || margins.default) : margins.default
  return Math.round(mrp * margin)
}

/**
 * Get items by category
 */
export function getItemsByCategory(category: string): MasterItem[] {
  return ITEM_MASTER.filter(item => item.category === category)
}

/**
 * Get random popular items (for suggestions)
 */
export function getPopularItems(count: number = 10): MasterItem[] {
  // Return first N items (most common products)
  return ITEM_MASTER.slice(0, count)
}

/**
 * Format item name for display in autocomplete
 */
export function formatItemSuggestion(item: MasterItem): string {
  return `${item.name} → ${item.category} | ₹${item.mrp} | GST ${item.gst_rate}%`
}

/**
 * Validate and clean item data before saving
 */
export function validateItemData(item: Partial<MasterItem>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!item.name || item.name.trim().length === 0) {
    errors.push('Item name is required')
  }

  if (!item.category) {
    errors.push('Category is required')
  }

  if (!item.unit) {
    errors.push('Unit is required')
  }

  if (item.mrp === undefined || item.mrp <= 0) {
    errors.push('Valid MRP is required')
  }

  if (item.gst_rate === undefined || item.gst_rate < 0) {
    errors.push('Valid GST rate is required')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export type { MasterItem }
