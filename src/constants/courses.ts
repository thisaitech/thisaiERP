import type { Item } from '../types'
import { getAllCategories } from '../utils/categoryDefaults'

export type CourseCatalogEntry = {
  id: string
  name: string
  sellingPrice: number
}

export const DEFAULT_COURSES: CourseCatalogEntry[] = [
  { id: '1', name: 'FULLSTACK AI', sellingPrice: 35000 },
  { id: '2', name: 'AI ENGINEER', sellingPrice: 25000 },
  { id: '3', name: 'UI/UX DESIGN AI', sellingPrice: 10000 },
  { id: '4', name: 'SPOKEN ENGLISH AI', sellingPrice: 10000 },
  { id: '5', name: 'VIBE CODING', sellingPrice: 15000 },
  { id: '6', name: 'AI & GEN AI', sellingPrice: 6000 },
  { id: '7', name: 'AI & GEN AI & PROMPT ENGINEERING', sellingPrice: 10000 },
  { id: '8', name: 'AI AUTOMATIONS', sellingPrice: 15000 },
  { id: '9', name: 'PYTHON WITH ML(AI)', sellingPrice: 15000 },
  { id: '10', name: 'BASIC COMPUTER COURSE', sellingPrice: 10000 },
  { id: '11', name: 'INTERNSHIP', sellingPrice: 4000 },
]

const LEGACY_INVENTORY_CATEGORIES = new Set([
  'electronics',
  'furniture',
  'stationery',
  'hardware',
  'grocery',
  'grocery/provisions',
  'clothing',
  'clothing/apparel',
  'home',
  'home & kitchen',
  'cosmetics',
  'cosmetics/beauty',
  'toys',
  'toys & games',
  'consumables',
])

const normalizeName = (value: string) => value.trim().toLowerCase()

export function isLegacyInventoryCategory(category?: string): boolean {
  return LEGACY_INVENTORY_CATEGORIES.has((category || '').trim().toLowerCase())
}

export function isTrainingCourseCategory(category?: string): boolean {
  const normalized = (category || '').trim().toLowerCase()
  if (!normalized || isLegacyInventoryCategory(normalized)) return false
  return getAllCategories().some((courseCategory) => courseCategory.toLowerCase() === normalized)
}

export function matchesCatalogCourse(item: Pick<Item, 'id' | 'name'>): boolean {
  const name = normalizeName(item.name || '')
  return DEFAULT_COURSES.some(
    (course) => course.id === item.id || normalizeName(course.name) === name
  )
}

export function isTrainingCourseItem(item: Item): boolean {
  if (matchesCatalogCourse(item)) return true

  const category = (item.category || '').trim().toLowerCase()
  if (!category || isLegacyInventoryCategory(category)) return false
  if (category === 'general' || category === 'other') return false

  return isTrainingCourseCategory(item.category)
}

function findApiItemForCourse(course: CourseCatalogEntry, items: Item[]): Item | undefined {
  return items.find(
    (item) =>
      item.id === course.id || normalizeName(item.name || '') === normalizeName(course.name)
  )
}

/** Course rows for reports: catalog courses first, plus any extra training courses from the API. */
export function resolveCourseCatalogItems(items: Item[]): Item[] {
  const usedApiIds = new Set<string>()
  const catalogItems: Item[] = DEFAULT_COURSES.map((course) => {
    const apiItem = findApiItemForCourse(course, items)
    if (apiItem) {
      usedApiIds.add(apiItem.id)
      return apiItem
    }

    const now = new Date().toISOString()
    return {
      id: course.id,
      name: course.name,
      itemCode: '',
      category: 'General',
      sellingPrice: course.sellingPrice,
      purchasePrice: 0,
      unit: 'PCS' as Item['unit'],
      taxPreference: 'taxable' as Item['taxPreference'],
      tax: { cgst: 0, sgst: 0, igst: 0 },
      stock: 0,
      minStock: 0,
      maxStock: 0,
      reorderPoint: 10,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    }
  })

  const extraTrainingItems = items.filter(
    (item) => !usedApiIds.has(item.id) && isTrainingCourseItem(item) && !matchesCatalogCourse(item)
  )

  return [...catalogItems, ...extraTrainingItems]
}
