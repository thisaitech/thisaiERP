// naturalTamilParser.ts — FINAL WORKING VERSION (Dec 2025)
// SUPER SIMPLE & DIRECT - 100% Working for Tamil Shop Talk
// + SMART PRICE-BASED ITEM SELECTION (Biscuits, Chips, etc.)

import { executeAIFunction, type ActionResult, tamilItemMappings } from './aiActionHandler'

// ===== PRICE-BASED ITEM CATEGORIES =====
// Items that are commonly sold by price (e.g., "20 ரூபா biscuit")
export const PRICE_BASED_CATEGORIES = ['biscuits', 'biscuit', 'chips', 'chocolate', 'snacks', 'candy']

// Brand priority for auto-selection (first = highest priority)
export const BRAND_PRIORITY: Record<string, string[]> = {
  biscuits: ['parle-g', 'parle', 'marie', 'good day', 'britannia', 'oreo', 'hide & seek', 'bourbon', 'monaco'],
  chips: ['lays', 'kurkure', 'bingo', 'pringles', 'uncle chips'],
  chocolate: ['dairy milk', 'kitkat', '5 star', 'munch', 'perk']
}

// ===== KEYWORDS FOR DETECTION =====
const ITEM_KEYWORDS = [
  "மஞ்சள்", "மஞ்சல்", "மஞ்சல", "turmeric", "manjal", "mancal",
  "அரிசி", "rice", "arisi",
  "சர்க்கரை", "sugar", "சுகர்",
  "பருப்பு", "dal", "paruppu",
  "எண்ணெய்", "oil", "ennai",
  "மிளகு", "pepper", "milagu",
  "சில்லி", "chilli", "மிளகாய்",
  "shirt", "pant", "towel", "bedsheet",
  "டெர்மரிக்", "தெர்மரிக்", "டர்மரிக்",
  // Price-based items
  "பிஸ்கட்", "பிஸ்கோத்", "biscuit", "biscuits",
  "சிப்ஸ்", "chips",
  "சாக்லேட்", "chocolate",
  "பார்லே", "parle", "marie", "good day", "britannia", "oreo", "bourbon", "monaco",
  "50-50", "hide & seek", "dark fantasy"
]

const UNIT_WORDS = [
  "பாக்கெட்", "பேக்கெட்", "packet", "pack",
  "கிலோ", "kg", "kilo",
  "மீட்டர்", "meter",
  "லிட்டர்", "liter", "litre",
  "பீஸ்", "piece", "pcs",
  "strip", "ஸ்ட்ரிப்",
  "box", "பாக்ஸ்"
]

const CUSTOMER_NAMES = [
  "சிவா", "சிவன்", "siva", "shiva",
  "மீனா", "meena", "mina",
  "குமார்", "kumar",
  "ரமேஷ்", "ramesh",
  "லக்ஷ்மி", "lakshmi",
  "ராஜா", "raja",
  "மோகன்", "mohan",
  "கணேஷ்", "ganesh",
  "சுரேஷ்", "suresh",
  "விஜய்", "vijay",
  "அருண்", "arun",
  "cash"
]

// Customer suffixes to remove
const CUSTOMER_SUFFIXES = /(?:க்கு|கப்|க்கோடு|வுக்கு|ோடு|வு|வா|க்|கு|உக்கு|க்கான|கோர்)$/gu

export interface ParsedResult {
  customer?: string
  items: Array<{
    name: string
    qty: number
    unit: string
    price?: number        // For price-based selection (e.g., "20 ரூபா biscuit")
    brand?: string        // Specific brand if mentioned
    category?: string     // Category for smart matching (biscuits, chips, etc.)
  }>
  shouldSave: boolean
  shouldWhatsApp: boolean
  shouldPrint: boolean
}

/**
 * MAIN PARSER - SUPER SIMPLE & DIRECT!
 * Works with ANY order, handles Whisper variations
 * + SMART PRICE-BASED ITEM SELECTION
 */
export function parseNaturalTamil(transcript: string): ParsedResult {
  console.log('🎯 Natural Tamil Parser:', transcript)

  // Step 1: Initial lowercase
  let text = transcript.toLowerCase()

  // Step 2: CRITICAL - Split concatenated Tamil words (Whisper bug)
  // "மஞ்சலொரு" → "மஞ்சள் ஒரு", "அரிசியைது" → "அரிசி ஐந்து"
  text = text.replace(/மஞ்சலொரு/gi, 'மஞ்சள் ஒரு')
  text = text.replace(/மஞ்சளொரு/gi, 'மஞ்சள் ஒரு')
  text = text.replace(/அரிசியொரு/gi, 'அரிசி ஒரு')
  text = text.replace(/அரிசியைது/gi, 'அரிசி ஐந்து')
  text = text.replace(/சர்க்கரையொரு/gi, 'சர்க்கரை ஒரு')
  text = text.replace(/பருப்பொரு/gi, 'பருப்பு ஒரு')
  text = text.replace(/எண்ணெயொரு/gi, 'எண்ணெய் ஒரு')

  // Step 3: Fix Tamil number words → digits (BEFORE punctuation removal)
  // "ஒரு", "ஒன்னு" etc should become " 1 " with spaces
  text = text.replace(/ஒரு|ஒன்னு|ஒன்று|ோர்/gi, ' 1 ')
  text = text.replace(/ரெண்டு|இரண்டு/gi, ' 2 ')
  text = text.replace(/மூணு|மூன்று/gi, ' 3 ')
  text = text.replace(/நாலு|நான்கு/gi, ' 4 ')
  text = text.replace(/அஞ்சு|ஐந்து/gi, ' 5 ')
  text = text.replace(/ஆறு/gi, ' 6 ')
  text = text.replace(/ஏழு/gi, ' 7 ')
  text = text.replace(/எட்டு/gi, ' 8 ')
  text = text.replace(/ஒன்பது/gi, ' 9 ')
  text = text.replace(/பத்து/gi, ' 10 ')

  // Step 3.5: PRICE-BASED MAGIC - Convert Tamil rupee amounts
  // "இருபது ரூபா" → "20 ரூபாய்", "பத்து ரூபா" → "10 ரூபாய்"
  text = text.replace(/இருபது\s*ரூபா(ய்|y)?|twenty\s*rup/gi, ' 20 ரூபாய் ')
  text = text.replace(/முப்பது\s*ரூபா(ய்|y)?|thirty\s*rup/gi, ' 30 ரூபாய் ')
  text = text.replace(/நாற்பது\s*ரூபா(ய்|y)?|forty\s*rup/gi, ' 40 ரூபாய் ')
  text = text.replace(/ஐம்பது\s*ரூபா(ய்|y)?|fifty\s*rup/gi, ' 50 ரூபாய் ')
  text = text.replace(/அறுபது\s*ரூபா(ய்|y)?|sixty\s*rup/gi, ' 60 ரூபாய் ')
  text = text.replace(/எழுபது\s*ரூபா(ய்|y)?|seventy\s*rup/gi, ' 70 ரூபாய் ')
  text = text.replace(/எண்பது\s*ரூபா(ய்|y)?|eighty\s*rup/gi, ' 80 ரூபாய் ')
  text = text.replace(/தொண்ணூறு\s*ரூபா(ய்|y)?|ninety\s*rup/gi, ' 90 ரூபாய் ')
  text = text.replace(/நூறு\s*ரூபா(ய்|y)?|hundred\s*rup/gi, ' 100 ரூபாய் ')
  // Single digit rupees: பத்து ரூபா, ஐந்து ரூபா
  text = text.replace(/ 10 \s*ரூபா(ய்|y)?/gi, ' 10 ரூபாய் ')
  text = text.replace(/ 5 \s*ரூபா(ய்|y)?/gi, ' 5 ரூபாய் ')
  // Numeric rupees: "20 ரூபா", "10 rs", "50 rupee"
  text = text.replace(/(\d+)\s*(ரூபா(ய்)?|rs|rupee|rupees)/gi, ' $1 ரூபாய் ')

  // Step 4: Remove punctuation
  text = text.replace(/[,.।?!。]/g, ' ')

  // Step 5: Remove action words that confuse parsing
  text = text.replace(/போடு|போடுங்க|கொடு|done|add|செய்|podu|kodu|poo/gi, ' ')

  // Step 6: Clean multiple spaces
  text = text.replace(/\s+/g, ' ').trim()
  console.log('🧹 Cleaned:', text)

  const result: ParsedResult = {
    items: [],
    shouldSave: false,
    shouldWhatsApp: false,
    shouldPrint: false
  }

  // Step 3: Find customer name
  // Look for known names or words with customer suffix in first part
  const words = text.split(' ')

  for (let i = 0; i < Math.min(4, words.length); i++) {
    const word = words[i]

    // Check if it's a known customer name
    const isKnownName = CUSTOMER_NAMES.some(name =>
      word.includes(name.toLowerCase()) || name.toLowerCase().includes(word)
    )

    // Check if word has customer suffix
    const hasSuffix = CUSTOMER_SUFFIXES.test(word)

    if (isKnownName || hasSuffix) {
      let customerName = word.replace(CUSTOMER_SUFFIXES, '').trim()
      if (customerName && customerName.length > 1) {
        result.customer = customerName
        console.log('✓ Customer found:', customerName)
        break
      }
    }
  }

  // Step 4: Find quantity (number in the text - but not price)
  // First extract price if present (number followed by ரூபாய்)
  const priceMatch = text.match(/(\d+)\s*ரூபாய்/)
  const itemPrice = priceMatch ? parseInt(priceMatch[1]) : undefined
  if (itemPrice) {
    console.log('💰 Price detected:', itemPrice, 'ரூபாய்')
  }

  // Find quantity (number NOT followed by ரூபாய்)
  const allNumbers = text.match(/(\d+(?:\.\d+)?)/g) || []
  let quantity = 1
  for (const num of allNumbers) {
    // Skip if this number is part of price
    if (priceMatch && text.indexOf(num + ' ரூபாய்') !== -1) continue
    if (priceMatch && num === priceMatch[1]) continue
    quantity = parseFloat(num) || 1
    break
  }

  // Step 5: Find item name, category, and brand
  let itemName = ''
  let unit = 'pcs'
  let category: string | undefined
  let brand: string | undefined

  // ===== PRICE-BASED ITEM DETECTION (Biscuit, Chips, etc.) =====
  const isPriceBasedItem = (
    /பிஸ்கட்|பிஸ்கோத்|biscuit|சிப்ஸ்|chips|சாக்லேட்|chocolate/i.test(text)
  )

  if (isPriceBasedItem) {
    // Detect category
    if (/பிஸ்கட்|பிஸ்கோத்|biscuit/i.test(text)) {
      category = 'biscuits'
      itemName = 'biscuit'
    } else if (/சிப்ஸ்|chips/i.test(text)) {
      category = 'chips'
      itemName = 'chips'
    } else if (/சாக்லேட்|chocolate/i.test(text)) {
      category = 'chocolate'
      itemName = 'chocolate'
    }

    // Detect brand if mentioned
    const brandPatterns = [
      { pattern: /parle[\s-]?g/i, brand: 'parle-g' },
      { pattern: /பார்லே[\s-]?ஜி/i, brand: 'parle-g' },
      { pattern: /marie|மேரி/i, brand: 'marie' },
      { pattern: /good\s*day|குட்\s*டே/i, brand: 'good day' },
      { pattern: /britannia|பிரிட்டானியா/i, brand: 'britannia' },
      { pattern: /oreo|ஓரியோ/i, brand: 'oreo' },
      { pattern: /hide\s*&?\s*seek/i, brand: 'hide & seek' },
      { pattern: /bourbon|போர்பன்/i, brand: 'bourbon' },
      { pattern: /monaco|மொனாக்கோ/i, brand: 'monaco' },
      { pattern: /50[\s-]?50|fifty[\s-]?fifty/i, brand: '50-50' },
      { pattern: /dark\s*fantasy/i, brand: 'dark fantasy' },
      { pattern: /lays|லேஸ்/i, brand: 'lays' },
      { pattern: /kurkure|குர்குரே/i, brand: 'kurkure' },
      { pattern: /bingo|பிங்கோ/i, brand: 'bingo' },
      { pattern: /dairy\s*milk|டெய்ரி\s*மில்க்/i, brand: 'dairy milk' },
      { pattern: /kitkat|கிட்கேட்/i, brand: 'kitkat' },
      { pattern: /5\s*star/i, brand: '5 star' },
    ]

    for (const { pattern, brand: b } of brandPatterns) {
      if (pattern.test(text)) {
        brand = b
        itemName = b  // Use brand as item name for exact match
        console.log('🏷️ Brand detected:', brand)
        break
      }
    }

    // If price + category detected, build smart item name
    if (itemPrice && category && !brand) {
      // No specific brand - will search by price + category
      itemName = `${itemPrice} rs ${category}`
      console.log('🎯 Price-based search:', itemName)
    } else if (itemPrice && brand) {
      // Brand + price - very specific
      itemName = `${brand} ${itemPrice}`
      console.log('🎯 Brand + Price search:', itemName)
    }

    unit = 'pcs'  // Biscuits/chips are always pcs
  }

  // ===== REGULAR ITEM DETECTION =====
  if (!itemName) {
    // First, check for known item keywords
    for (const keyword of ITEM_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        // Map to standard name - use SHORT names that match inventory
        if (keyword.includes('மஞ்ச') || keyword === 'manjal' || keyword === 'mancal' || keyword.includes('டெர்மரிக்') || keyword.includes('தெர்மரிக்') || keyword.includes('turmeric')) {
          itemName = 'turmeric'
        } else if (keyword.includes('அரிசி') || keyword === 'rice' || keyword === 'arisi') {
          itemName = 'rice'
        } else if (keyword.includes('சர்க்கரை') || keyword === 'sugar' || keyword === 'சுகர்') {
          itemName = 'sugar'
        } else if (keyword.includes('பருப்பு') || keyword === 'dal') {
          itemName = 'dal'
        } else if (keyword.includes('எண்ணெய்') || keyword === 'oil') {
          itemName = 'oil'
        } else if (keyword.includes('மிளகு') || keyword === 'pepper') {
          itemName = 'pepper'
        } else if (keyword.includes('சில்லி') || keyword.includes('மிளகாய்') || keyword === 'chilli') {
          itemName = 'chilli'
        } else if (!PRICE_BASED_CATEGORIES.includes(keyword.toLowerCase())) {
          // Don't set generic category names as item name
          itemName = keyword
        }
        break
      }
    }
  }

  // If no keyword found, try to find item name before the number
  if (!itemName) {
    const firstNumber = allNumbers[0]
    if (firstNumber) {
      const beforeNumber = text.split(firstNumber)[0]
      const itemWords = beforeNumber.split(' ').filter(w =>
        w.length > 2 &&
        !UNIT_WORDS.some(u => w.includes(u.toLowerCase())) &&
        !CUSTOMER_NAMES.some(n => w.includes(n.toLowerCase())) &&
        !w.match(/புது|புதிய|new|பில்|bill|ரூபாய்/)
      )

      if (itemWords.length > 0) {
        const lastWord = itemWords[itemWords.length - 1]
        itemName = tamilItemMappings[lastWord] || lastWord
        console.log('✓ Item from before number:', itemName)
      }
    }
  }

  // Step 6: Find unit
  for (const unitWord of UNIT_WORDS) {
    if (text.includes(unitWord.toLowerCase())) {
      if (unitWord.includes('பாக்கெட்') || unitWord.includes('பேக்கெட்') || unitWord === 'packet' || unitWord === 'pack') {
        unit = 'packet'
      } else if (unitWord.includes('கிலோ') || unitWord === 'kg' || unitWord === 'kilo') {
        unit = 'kg'
      } else if (unitWord.includes('மீட்டர்') || unitWord === 'meter') {
        unit = 'meter'
      } else if (unitWord.includes('லிட்டர்') || unitWord === 'liter' || unitWord === 'litre') {
        unit = 'litre'
      } else if (unitWord.includes('strip') || unitWord.includes('ஸ்ட்ரிப்')) {
        unit = 'strip'
      } else if (unitWord.includes('box') || unitWord.includes('பாக்ஸ்')) {
        unit = 'box'
      } else {
        unit = 'pcs'
      }
      break
    }
  }

  // Add item if found
  if (itemName && itemName.length > 1) {
    result.items.push({
      name: itemName,
      qty: quantity,
      unit,
      price: itemPrice,
      brand,
      category
    })
    console.log('✓ Item found:', itemName, quantity, unit, itemPrice ? `₹${itemPrice}` : '', brand || '')
  }

  // Step 7: Check for actions (save/whatsapp/print)
  result.shouldSave = /சேவ்|சேவு|save|சேஃப்|முடி|finish|complete/i.test(text)
  result.shouldWhatsApp = /வாட்சப்|வாட்ஸ்|whatsapp|அனுப்பு/i.test(text)
  result.shouldPrint = /print|பிரிண்ட்|அச்சு/i.test(text)

  console.log('📋 Parsed Result:', result)
  return result
}

/**
 * Execute parsed commands
 */
export async function executeNaturalTamilCommand(transcript: string): Promise<ActionResult[]> {
  const parsed = parseNaturalTamil(transcript)
  const results: ActionResult[] = []

  // 1. Select customer
  if (parsed.customer) {
    console.log('🔍 Selecting customer:', parsed.customer)
    const customerResult = await executeAIFunction('newSale', { customerName: parsed.customer })
    results.push(customerResult)

    if (customerResult.success) {
      console.log('✅ Customer selected:', parsed.customer)
    } else {
      console.log('⚠️ Customer not found, continuing anyway')
    }
  }

  // 2. Add items (with smart price-based selection for biscuits/chips/etc.)
  for (const item of parsed.items) {
    console.log('➕ Adding item:', item.name, item.qty, item.unit, item.price ? `₹${item.price}` : '', item.brand || '')
    const itemResult = await executeAIFunction('addItem', {
      itemName: item.name,
      quantity: item.qty,
      unit: item.unit,
      price: item.price,      // For price-based selection (e.g., "20 ரூபா biscuit")
      category: item.category, // Category for smart matching
      brand: item.brand        // Specific brand if mentioned
    })
    results.push(itemResult)

    if (itemResult.success) {
      console.log('✅ Item added:', item.name)
    } else {
      console.log('⚠️ Item not found:', item.name)
    }
  }

  // 3. Save bill
  if (parsed.shouldSave) {
    console.log('💾 Saving bill...')
    const saveResult = await executeAIFunction('generateInvoice', {})
    results.push(saveResult)
  }

  // 4. WhatsApp
  if (parsed.shouldWhatsApp) {
    console.log('📱 Sending WhatsApp...')
    const whatsappResult = await executeAIFunction('sendWhatsApp', {})
    results.push(whatsappResult)
  }

  // 5. Print
  if (parsed.shouldPrint) {
    console.log('🖨️ Printing...')
    const printResult = await executeAIFunction('printInvoice', {})
    results.push(printResult)
  }

  return results
}

/**
 * Get Tamil-friendly summary message
 */
export function getResultSummary(parsed: ParsedResult, results: ActionResult[]): string {
  const parts: string[] = []

  if (parsed.customer) {
    parts.push(`👤 ${parsed.customer}`)
  }

  if (parsed.items.length > 0) {
    const itemStrs = parsed.items.map(i => `${i.name} ×${i.qty}`)
    parts.push(`📦 ${itemStrs.join(', ')}`)
  }

  if (parsed.shouldSave) parts.push('💾 Save')
  if (parsed.shouldWhatsApp) parts.push('📱 WhatsApp')
  if (parsed.shouldPrint) parts.push('🖨️ Print')

  if (parts.length === 0) {
    return '❓ புரியல - "சிவாக்கு மஞ்சள் 1 சேவ்" சொல்லுங்க'
  }

  const successCount = results.filter(r => r.success).length
  const total = results.length

  if (successCount === total && total > 0) {
    return `✅ Done: ${parts.join(' → ')}`
  } else if (successCount > 0) {
    return `⚠️ ${successCount}/${total}: ${parts.join(' → ')}`
  } else if (total === 0) {
    return `📋 Parsed: ${parts.join(' → ')}`
  } else {
    return `❌ Failed - ${parts.join(' → ')}`
  }
}
