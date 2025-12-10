// AI Action Handler - Executes AI function calls
import { getParties } from './partyService'
import { getItems } from './itemService'
import type { Party, Item } from '../types'

export interface ActionResult {
  success: boolean
  message: string
  data?: any
}

// ========== INDIAN NAME FIXES (Shiva → Siva, etc.) ==========
const indianNameFixes: Record<string, string> = {
  "shiva": "siva",
  "sheela": "sila",
  "kumaar": "kumar",
  "prasaad": "prasad",
  "laxmi": "lakshmi",
  "lakshmi": "laxmi",
  "sri": "shree",
  "shree": "sri",
  "raaj": "raj",
  "mohan": "mohan",
  "krishna": "krishna",
  "raam": "ram",
  "ganesh": "ganesh",
  "suresh": "suresh",
  "mahesh": "mahesh"
}

// ========== TAMIL TO ENGLISH NAME MAPPINGS ==========
const tamilNameMappings: Record<string, string[]> = {
  // Tamil script → possible English spellings
  "சிவா": ["siva", "shiva", "seeva"],
  "சிவன்": ["sivan", "shivan"],
  "மீனா": ["meena", "mina", "meenaa"],
  "குமார்": ["kumar", "kumaar"],
  "ராஜா": ["raja", "raaja", "rajaa"],
  "மோகன்": ["mohan", "mohann"],
  "கிருஷ்ணா": ["krishna", "krishnaa"],
  "ராம்": ["ram", "raam"],
  "கணேஷ்": ["ganesh", "ganeshan"],
  "சுரேஷ்": ["suresh", "suresh"],
  "மகேஷ்": ["mahesh", "mahesh"],
  "லக்ஷ்மி": ["lakshmi", "laxmi"],
  "சரவணன்": ["saravanan", "saravanann"],
  "முருகன்": ["murugan", "murugann"],
  "செல்வம்": ["selvam", "selvamm"],
  "அருண்": ["arun", "arunkumar"],
  "விஜய்": ["vijay", "vijayan"],
  "கார்த்திக்": ["karthik", "karthick"],
  "பிரகாஷ்": ["prakash", "prakashh"],
  "ரவி": ["ravi", "ravii"],
  "அன்பு": ["anbu", "anbuu"],
  "தமிழ்": ["tamil", "tamizh"],
  "வேலு": ["velu", "veluu"],
  // Romanized Tamil pronunciations
  "sivaa": ["siva", "shiva"],
  "sivan": ["sivan", "shivan"],
  "meenaa": ["meena", "mina"],
  "kumaar": ["kumar"],
  "raajaa": ["raja"],
  "mohann": ["mohan"]
}

// ========== TAMIL ITEM MAPPINGS (200+ items) ==========
// Includes phonetic variations for speech recognition
export const tamilItemMappings: Record<string, string> = {
  // ===== GROCERIES / KIRANA =====
  "மஞ்சள்": "turmeric",
  "manjal": "turmeric",
  "mancal": "turmeric",
  "mangal": "turmeric",
  "munjal": "turmeric",
  "மஞ்சல்": "turmeric",
  "turmeric": "turmeric",
  "tumorich": "turmeric",
  "tumorik": "turmeric",
  "tumeric": "turmeric",
  "turmaric": "turmeric",
  "டர்மரிக்": "turmeric",
  "டர்மெரிக்": "turmeric",
  "டெர்மரிக்": "turmeric",
  "dermeric": "turmeric",
  "termeric": "turmeric",
  "haldi": "turmeric",
  "மஞ்சள்தூள்": "turmeric powder",
  "மிளகு": "pepper",
  "milagu": "pepper",
  "மிளகாய்த்தூள்": "chilli powder",
  "milagai thool": "chilli powder",
  "milagai": "chilli",
  "சில்லி": "chilli",
  "சில்லிப்": "chilli",
  "chilli powder": "chilli powder",
  "chili powder": "chilli powder",
  "சில்லி பவ்டர்": "chilli powder",
  "சில்லிப் பவ்டர்": "chilli powder",
  "கடலை": "groundnut",
  "kadalai": "groundnut",
  "எண்ணெய்": "oil",
  "ennai": "oil",
  "oil": "oil",
  "oyl": "oil",
  "tel": "oil",
  "சர்க்கரை": "sugar",
  "sakkarai": "sugar",
  "sugar": "sugar",
  "suger": "sugar",
  "seeni": "sugar",
  "cheeni": "sugar",
  "அரிசி": "rice",
  "arisi": "rice",
  "rice": "rice",
  "rais": "rice",
  "ries": "rice",
  "chaval": "rice",
  "chawal": "rice",
  "சம்பா அரிசி": "samba rice",
  "பொன்னி அரிசி": "ponni rice",
  "பாஸ்மதி": "basmati",
  "பருப்பு": "dal",
  "paruppu": "dal",
  "dal": "dal",
  "dhal": "dal",
  "daal": "dal",
  "துவரம் பருப்பு": "toor dal",
  "toor dal": "toor dal",
  "toor": "toor dal",
  "thuvaram paruppu": "toor dal",
  "உளுத்தம் பருப்பு": "urad dal",
  "பாசிப்பருப்பு": "moong dal",
  "கடலைப்பருப்பு": "chana dal",
  "கோதுமை": "wheat",
  "gothumai": "wheat",
  "ரவை": "rava",
  "ravai": "rava",
  "மைதா": "maida",
  "maida": "maida",
  "சம்பா ரவை": "samba rava",
  "samba ravai": "samba rava",
  "உப்பு": "salt",
  "uppu": "salt",
  "புளி": "tamarind",
  "puli": "tamarind",
  "தேங்காய்": "coconut",
  "thengai": "coconut",
  "வெங்காயம்": "onion",
  "vengayam": "onion",
  "தக்காளி": "tomato",
  "thakkali": "tomato",
  "கத்திரிக்காய்": "brinjal",
  "kathirikai": "brinjal",
  "உருளைக்கிழங்கு": "potato",
  "urulai": "potato",
  // Spices
  "வெந்தயம்": "fenugreek",
  "venthayam": "fenugreek",
  "கொத்தமல்லி": "coriander",
  "kothamalli": "coriander",
  "பூண்டு": "garlic",
  "poondu": "garlic",
  "இஞ்சி": "ginger",
  "inji": "ginger",
  "சீரகம்": "cumin",
  "jeeragam": "cumin",
  "கறிவேப்பிலை": "curry leaves",
  "ஏலக்காய்": "cardamom",
  "elakkai": "cardamom",
  "கிராம்பு": "clove",
  "grambu": "clove",
  "பட்டை": "cinnamon",
  "pattai": "cinnamon",
  "சோம்பு": "fennel",
  "sombu": "fennel",
  "கடுகு": "mustard",
  "kadugu": "mustard",
  // Oils
  "நல்லெண்ணெய்": "sesame oil",
  "தேங்காய் எண்ணெய்": "coconut oil",
  "சூரியகாந்தி எண்ணெய்": "sunflower oil",
  "கடலை எண்ணெய்": "groundnut oil",
  // Dairy
  "பால்": "milk",
  "paal": "milk",
  "தயிர்": "curd",
  "thayir": "curd",
  "வெண்ணெய்": "butter",
  "நெய்": "ghee",
  "nei": "ghee",
  "பன்னீர்": "paneer",
  "paneer": "paneer",
  // ===== TEXTILES =====
  "சட்டை": "shirt",
  "sattai": "shirt",
  "shirt": "shirt",
  "பேண்ட்": "pant",
  "pant": "pant",
  "புடவை": "saree",
  "pudavai": "saree",
  "saree": "saree",
  "துண்டு": "towel",
  "thundu": "towel",
  "டவல்": "towel",
  "towel": "towel",
  "பெட்ஷீட்": "bedsheet",
  "bedsheet": "bedsheet",
  "லுங்கி": "lungi",
  "lungi": "lungi",
  "குர்தா": "kurta",
  "kurta": "kurta",
  "சல்வார்": "salwar",
  "salwar": "salwar",
  "பனியன்": "vest",
  "baniyan": "vest",
  "சாக்ஸ்": "socks",
  "socks": "socks",
  // ===== ELECTRONICS =====
  "charger": "charger",
  "சார்ஜர்": "charger",
  "earphone": "earphone",
  "earbuds": "earbuds",
  "memory card": "memory card",
  "cover": "phone cover",
  "கவர்": "phone cover",
  "cable": "cable",
  "கேபிள்": "cable",
  // ===== PHARMACY =====
  "paracetamol": "paracetamol",
  "பாராசிட்டமால்": "paracetamol",
  "crocin": "crocin",
  "dolo": "dolo",
  "vitamin": "vitamin",
  "bp tablet": "bp tablet",
  "cold medicine": "cold medicine",
  "குளிர் மருந்து": "cold medicine"
}

// ========== TAMIL UNIT MAPPINGS ==========
export const tamilUnitMappings: Record<string, string> = {
  // Weight
  "கிலோ": "kg",
  "கி.லி": "kg",
  "kilo": "kg",
  "kg": "kg",
  "கிலோகிராம்": "kg",
  "கிராம்": "g",
  "gram": "g",
  "grams": "g",
  "g": "g",
  // Packets - பேக்கெட் is Whisper's common variation of பாக்கெட்
  "பாக்கெட்": "packet",
  "பேக்கெட்": "packet",
  "packet": "packet",
  "pack": "packet",
  "பேக்": "packet",
  // Liquid
  "லிட்டர்": "litre",
  "litre": "litre",
  "liter": "litre",
  "ltr": "litre",
  "ml": "ml",
  "மில்லி": "ml",
  // Length
  "மீட்டர்": "meter",
  "meter": "meter",
  "mtr": "meter",
  // Pieces
  "பீஸ்": "pcs",
  "பீசு": "pcs",
  "piece": "pcs",
  "pieces": "pcs",
  "pcs": "pcs",
  // Pharmacy
  "strip": "strip",
  "ஸ்ட்ரிப்": "strip",
  "tablet": "tablet",
  "tablets": "tablet",
  "டேப்லெட்": "tablet",
  "box": "box",
  "பாக்ஸ்": "box",
  // Dozens
  "dozen": "dozen",
  "டஜன்": "dozen",
  // Tamil action words that indicate unit completion
  "போடு": "pcs",
  "done": "pcs",
  "podu": "pcs",
  "செய்": "pcs"
}

/**
 * Convert Tamil name to English variations
 */
function convertTamilName(text: string): string[] {
  const lower = text.toLowerCase().trim()

  // Check if it's a Tamil script name
  if (tamilNameMappings[text]) {
    return tamilNameMappings[text]
  }

  // Check romanized Tamil names
  if (tamilNameMappings[lower]) {
    return tamilNameMappings[lower]
  }

  // Apply Indian name fixes
  let result = lower
  for (const [wrong, correct] of Object.entries(indianNameFixes)) {
    if (result.includes(wrong)) {
      result = result.replace(new RegExp(wrong, 'gi'), correct)
    }
  }

  // Return original + fixed version
  return result === lower ? [lower] : [lower, result]
}

/**
 * Apply Indian name corrections (Shiva → Siva)
 */
function applyIndianNameFixes(text: string): string {
  // First check if it's a Tamil script name
  const tamilVariants = tamilNameMappings[text]
  if (tamilVariants && tamilVariants.length > 0) {
    return tamilVariants[0] // Return first (most common) English spelling
  }

  let result = text.toLowerCase()
  for (const [wrong, correct] of Object.entries(indianNameFixes)) {
    if (result.includes(wrong)) {
      result = result.replace(new RegExp(wrong, 'gi'), correct)
    }
  }
  return result
}

/**
 * Convert Tamil item name to English
 */
export function convertTamilItem(text: string): string {
  const lower = text.toLowerCase().trim()
  return tamilItemMappings[lower] || tamilItemMappings[text] || text
}

/**
 * Convert Tamil unit to English
 */
export function convertTamilUnit(text: string): string {
  const lower = text.toLowerCase().trim()
  return tamilUnitMappings[lower] || tamilUnitMappings[text] || text
}

/**
 * Simple string similarity (0 to 1)
 */
function stringSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()

  if (aLower === bLower) return 1
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.9

  // Calculate character match score
  let matches = 0
  const minLen = Math.min(aLower.length, bLower.length)
  for (let i = 0; i < minLen; i++) {
    if (aLower[i] === bLower[i]) matches++
  }

  return matches / Math.max(aLower.length, bLower.length)
}

/**
 * Get the display name from a Party object (checks multiple fields)
 */
export function getPartyName(party: Party): string {
  return (party as any).name || party.displayName || party.companyName || party.contactPersonName || 'Unknown'
}

/**
 * Smart customer finder with fuzzy matching, Indian name fixes and Tamil support
 */
export async function smartFindCustomer(spokenName: string): Promise<{ customer: Party | null; confidence: number; alternatives: Party[] }> {
  try {
    const parties = await getParties('customer')

    // Get all possible name variations (Tamil → English conversions)
    const nameVariations = convertTamilName(spokenName)
    console.log('🔍 Customer search variations:', nameVariations, 'from:', spokenName)

    // Also add the Indian name fixes version
    const searchName = applyIndianNameFixes(spokenName)
    if (!nameVariations.includes(searchName)) {
      nameVariations.push(searchName)
    }

    // Try exact match first for all variations
    for (const variant of nameVariations) {
      const exactMatch = parties.find(p =>
        (p as any).name?.toLowerCase() === variant ||
        p.displayName?.toLowerCase() === variant ||
        p.companyName?.toLowerCase() === variant ||
        p.contactPersonName?.toLowerCase() === variant
      )
      if (exactMatch) {
        console.log('✓ Exact match found for variant:', variant)
        return { customer: exactMatch, confidence: 1, alternatives: [] }
      }
    }

    // Try partial/contains match for all variations
    for (const variant of nameVariations) {
      const partialMatches = parties.filter(p => {
        const name = getPartyName(p).toLowerCase()
        const cleanSearch = variant.replace(/\s+/g, '')
        const cleanName = name.replace(/\s+/g, '')
        return name.includes(variant) ||
               variant.includes(name) ||
               cleanName.includes(cleanSearch) ||
               cleanSearch.includes(cleanName)
      })

      if (partialMatches.length === 1) {
        console.log('✓ Partial match found for variant:', variant)
        return { customer: partialMatches[0], confidence: 0.9, alternatives: [] }
      }
      if (partialMatches.length > 1) {
        console.log('✓ Multiple partial matches for variant:', variant)
        return { customer: partialMatches[0], confidence: 0.8, alternatives: partialMatches.slice(1, 4) }
      }
    }

    // Fuzzy match - find closest using best score across all variations
    const scored = parties.map(p => {
      const partyNames = [
        (p as any).name || '',
        p.displayName || '',
        p.companyName || '',
        p.contactPersonName || ''
      ].filter(n => n)

      // Find best score among all name variations and party name fields
      let bestScore = 0
      for (const variant of nameVariations) {
        for (const partyName of partyNames) {
          const score = stringSimilarity(variant, partyName)
          if (score > bestScore) bestScore = score
        }
      }

      return { customer: p, score: bestScore }
    }).sort((a, b) => b.score - a.score)

    const best = scored[0]
    if (best && best.score >= 0.6) {
      console.log('✓ Fuzzy match:', getPartyName(best.customer), 'score:', best.score)
      return {
        customer: best.customer,
        confidence: best.score,
        alternatives: scored.slice(1, 4).map(s => s.customer)
      }
    }

    console.log('✗ No good match found for:', spokenName)
    return { customer: null, confidence: 0, alternatives: scored.slice(0, 3).map(s => s.customer) }
  } catch (error) {
    console.error('Error in smartFindCustomer:', error)
    return { customer: null, confidence: 0, alternatives: [] }
  }
}

/**
 * Smart item finder with Tamil support and SUPER FORGIVING fuzzy matching
 * Works with partial names, Tamil variations, and word-based matching
 */
export async function smartFindItem(spokenItem: string): Promise<{ item: Item | null; confidence: number; alternatives: Item[] }> {
  try {
    const items = await getItems()
    const spokenLower = spokenItem.toLowerCase().trim()

    // Build search variations - all possible names to search
    const searchVariations: string[] = [spokenLower]

    // Add Tamil-converted version
    const englishName = convertTamilItem(spokenItem).toLowerCase()
    if (englishName !== spokenLower) {
      searchVariations.push(englishName)
    }

    // Add reverse lookup from tamilItemMappings (find all Tamil words that map to same English)
    for (const [tamil, english] of Object.entries(tamilItemMappings)) {
      if (english.toLowerCase() === englishName || english.toLowerCase().includes(englishName)) {
        if (!searchVariations.includes(tamil.toLowerCase())) {
          searchVariations.push(tamil.toLowerCase())
        }
      }
    }

    console.log('🔍 Item search variations:', searchVariations)

    // STEP 1: Exact match on any variation
    for (const searchName of searchVariations) {
      const exactMatch = items.find(i =>
        i.name?.toLowerCase() === searchName ||
        i.itemCode?.toLowerCase() === searchName
      )
      if (exactMatch) {
        console.log('✓ Exact match:', exactMatch.name)
        return { item: exactMatch, confidence: 1, alternatives: [] }
      }
    }

    // STEP 2: Partial/contains match (item name contains search OR search contains item name)
    for (const searchName of searchVariations) {
      const partialMatches = items.filter(i => {
        const name = (i.name || '').toLowerCase()
        return name.includes(searchName) || searchName.includes(name)
      })

      if (partialMatches.length === 1) {
        console.log('✓ Partial match:', partialMatches[0].name)
        return { item: partialMatches[0], confidence: 0.9, alternatives: [] }
      }
      if (partialMatches.length > 1) {
        console.log('✓ Multiple partial matches:', partialMatches.map(p => p.name))
        return { item: partialMatches[0], confidence: 0.85, alternatives: partialMatches.slice(1, 4) }
      }
    }

    // STEP 3: WORD-BASED matching - any word in search matches any word in item name
    // This handles "turmeric" matching "Turmeric Powder 500g", "Salem Turmeric", etc.
    for (const searchName of searchVariations) {
      const searchWords = searchName.split(/\s+/).filter(w => w.length > 2)

      const wordMatches = items.filter(i => {
        const itemWords = (i.name || '').toLowerCase().split(/\s+/)
        // Check if any search word appears in item name
        return searchWords.some(sw =>
          itemWords.some(iw => iw.includes(sw) || sw.includes(iw))
        )
      })

      if (wordMatches.length === 1) {
        console.log('✓ Word match:', wordMatches[0].name)
        return { item: wordMatches[0], confidence: 0.85, alternatives: [] }
      }
      if (wordMatches.length > 1) {
        console.log('✓ Multiple word matches:', wordMatches.map(p => p.name))
        return { item: wordMatches[0], confidence: 0.8, alternatives: wordMatches.slice(1, 4) }
      }
    }

    // STEP 4: First-letter/starts-with matching
    for (const searchName of searchVariations) {
      const startsWithMatches = items.filter(i => {
        const name = (i.name || '').toLowerCase()
        return name.startsWith(searchName.substring(0, 3)) || // First 3 chars match
               name.split(' ').some(word => word.startsWith(searchName.substring(0, 3)))
      })

      if (startsWithMatches.length > 0) {
        console.log('✓ Starts-with match:', startsWithMatches[0].name)
        return {
          item: startsWithMatches[0],
          confidence: 0.75,
          alternatives: startsWithMatches.slice(1, 4)
        }
      }
    }

    // STEP 5: Fuzzy match with LOWER threshold (0.35 instead of 0.5)
    const scored = items.map(i => {
      // Calculate best score across all search variations
      let bestScore = 0
      for (const searchName of searchVariations) {
        const score = stringSimilarity(searchName, (i.name || '').toLowerCase())
        if (score > bestScore) bestScore = score
      }
      return { item: i, score: bestScore }
    }).sort((a, b) => b.score - a.score)

    const best = scored[0]
    if (best && best.score >= 0.35) {
      console.log('✓ Fuzzy match:', best.item.name, 'score:', best.score)
      return {
        item: best.item,
        confidence: best.score,
        alternatives: scored.slice(1, 4).map(s => s.item)
      }
    }

    console.log('✗ No match found for:', spokenItem, '- returning top alternatives')
    return { item: null, confidence: 0, alternatives: scored.slice(0, 3).map(s => s.item) }
  } catch (error) {
    console.error('Error in smartFindItem:', error)
    return { item: null, confidence: 0, alternatives: [] }
  }
}

/**
 * Search for customers by name, phone, or email (with smart fuzzy matching)
 */
export async function searchCustomer(searchQuery: string): Promise<ActionResult> {
  try {
    // Use smart finder for better matching
    const { customer, confidence, alternatives } = await smartFindCustomer(searchQuery)

    if (customer && confidence >= 0.7) {
      return {
        success: true,
        message: `✓ Found: ${getPartyName(customer)}`,
        data: {
          action: 'searchCustomer',
          matches: [customer, ...alternatives],
          selectedCustomer: customer,
          confidence
        }
      }
    }

    if (customer && confidence >= 0.5) {
      return {
        success: true,
        message: `Did you mean "${getPartyName(customer)}"?`,
        data: {
          action: 'searchCustomer',
          matches: [customer, ...alternatives],
          selectedCustomer: customer,
          confidence
        }
      }
    }

    if (alternatives.length > 0) {
      return {
        success: false,
        message: `No exact match for "${searchQuery}". Similar customers:`,
        data: { action: 'searchCustomer', matches: alternatives }
      }
    }

    return {
      success: false,
      message: `No customers found matching "${searchQuery}". Create new?`,
      data: { action: 'searchCustomer', matches: [] }
    }
  } catch (error) {
    console.error('Error searching customer:', error)
    return {
      success: false,
      message: 'Error searching for customer. Please try again.'
    }
  }
}

/**
 * Search for items/products by name (with Tamil support and SUPER FORGIVING fuzzy matching)
 */
export async function searchItem(itemName: string): Promise<ActionResult> {
  try {
    // Use smart finder with Tamil support
    const { item, confidence, alternatives } = await smartFindItem(itemName)

    // SUPER FORGIVING - accept ANY match with confidence >= 0.35
    if (item && confidence >= 0.5) {
      return {
        success: true,
        message: `✓ Found: ${item.name}`,
        data: {
          matches: [item, ...alternatives],
          selectedItem: item,
          confidence
        }
      }
    }

    // Even low confidence matches (0.35-0.5) are accepted in voice mode
    if (item && confidence >= 0.35) {
      console.log('⚡ Low confidence match accepted:', item.name, confidence)
      return {
        success: true,
        message: `✓ Best match: ${item.name}`,
        data: {
          matches: [item, ...alternatives],
          selectedItem: item,
          confidence
        }
      }
    }

    // If we have alternatives, pick the first one (even with 0 confidence)
    if (alternatives.length > 0) {
      console.log('⚡ Using first alternative:', alternatives[0].name)
      return {
        success: true,
        message: `✓ Similar: ${alternatives[0].name}`,
        data: {
          matches: alternatives,
          selectedItem: alternatives[0],
          confidence: 0.3
        }
      }
    }

    return {
      success: false,
      message: `No items found for "${itemName}". Add manually?`,
      data: { matches: [] }
    }
  } catch (error) {
    console.error('Error searching item:', error)
    return {
      success: false,
      message: 'Error searching for item. Please try again.'
    }
  }
}

/**
 * Smart price-based item finder
 * Finds items by price + category (e.g., "20 rupee biscuit")
 * Prioritizes: 1) Exact price match, 2) Highest profit margin, 3) Highest stock
 */
export async function smartFindByPrice(
  price: number,
  category: string,
  brand?: string
): Promise<{ item: Item | null; confidence: number; alternatives: Item[] }> {
  try {
    const items = await getItems()

    console.log(`🔍 Price-based search: ₹${price} ${category}${brand ? ` (${brand})` : ''}`)

    // Filter by category first
    const categoryItems = items.filter(i => {
      const itemName = (i.name || '').toLowerCase()
      const itemCategory = (i.category || '').toLowerCase()
      return itemCategory.includes(category) ||
             category.split(' ').some(c => itemName.includes(c))
    })

    if (categoryItems.length === 0) {
      console.log('✗ No items in category:', category)
      return { item: null, confidence: 0, alternatives: [] }
    }

    // If brand specified, filter by brand
    let candidates = categoryItems
    if (brand) {
      const brandItems = categoryItems.filter(i =>
        (i.name || '').toLowerCase().includes(brand.toLowerCase())
      )
      if (brandItems.length > 0) {
        candidates = brandItems
        console.log('🏷️ Found brand matches:', brandItems.length)
      }
    }

    // Find exact price matches
    const exactPriceMatches = candidates.filter(i =>
      i.sellingPrice === price ||
      Math.abs((i.sellingPrice || 0) - price) <= 2 // Allow ±2 tolerance
    )

    if (exactPriceMatches.length > 0) {
      // Sort by profit margin (highest first), then by stock
      const sorted = exactPriceMatches.sort((a, b) => {
        const profitA = (a.sellingPrice || 0) - (a.purchasePrice || 0)
        const profitB = (b.sellingPrice || 0) - (b.purchasePrice || 0)
        if (profitB !== profitA) return profitB - profitA
        return (b.stock || 0) - (a.stock || 0)
      })

      console.log('✓ Exact price match:', sorted[0].name, '₹' + sorted[0].sellingPrice)
      return {
        item: sorted[0],
        confidence: 1,
        alternatives: sorted.slice(1, 4)
      }
    }

    // No exact price match - find closest price
    const withPriceDiff = candidates.map(i => ({
      item: i,
      diff: Math.abs((i.sellingPrice || 0) - price)
    })).sort((a, b) => a.diff - b.diff)

    if (withPriceDiff.length > 0 && withPriceDiff[0].diff <= 10) {
      console.log('✓ Closest price match:', withPriceDiff[0].item.name, '₹' + withPriceDiff[0].item.sellingPrice)
      return {
        item: withPriceDiff[0].item,
        confidence: 0.8,
        alternatives: withPriceDiff.slice(1, 4).map(w => w.item)
      }
    }

    console.log('✗ No price match within range')
    return {
      item: null,
      confidence: 0,
      alternatives: withPriceDiff.slice(0, 3).map(w => w.item)
    }
  } catch (error) {
    console.error('Error in smartFindByPrice:', error)
    return { item: null, confidence: 0, alternatives: [] }
  }
}

/**
 * Add item to invoice (to be handled by the component)
 * Supports price-based item selection for biscuits/chips/etc.
 */
export async function addItem(
  itemName: string,
  quantity: number,
  unit?: string,
  price?: number,
  category?: string,
  brand?: string
): Promise<ActionResult> {
  try {
    let searchResult: ActionResult

    // If price + category specified, use price-based search
    if (price && category) {
      console.log(`💰 Using price-based search: ₹${price} ${category}`)
      const priceResult = await smartFindByPrice(price, category, brand)

      if (priceResult.item) {
        return {
          success: true,
          message: `Adding ${quantity} × ${priceResult.item.name} (₹${priceResult.item.sellingPrice})`,
          data: {
            action: 'ADD_ITEM',
            item: priceResult.item,
            quantity,
            unit: unit || priceResult.item.unit || 'pcs',
            priceMatched: true
          }
        }
      }

      // Fall through to regular search if price-based failed
      console.log('⚠️ Price-based search failed, trying regular search')
    }

    // Regular search
    searchResult = await searchItem(itemName)

    if (!searchResult.success || !searchResult.data?.selectedItem) {
      return {
        success: false,
        message: searchResult.message,
        data: {
          action: 'ADD_ITEM',
          itemName,
          quantity,
          unit,
          price,
          category,
          matches: searchResult.data?.matches || []
        }
      }
    }

    const item = searchResult.data.selectedItem as Item

    return {
      success: true,
      message: `Adding ${quantity} ${unit || item.unit} of ${item.name}`,
      data: {
        action: 'ADD_ITEM',
        item,
        quantity,
        unit: unit || item.unit
      }
    }
  } catch (error) {
    console.error('Error adding item:', error)
    return {
      success: false,
      message: 'Error adding item. Please try again.'
    }
  }
}

/**
 * Update quantity of an item in invoice
 */
export function updateQuantity(itemName: string, newQuantity: number): ActionResult {
  return {
    success: true,
    message: `Updating ${itemName} quantity to ${newQuantity}`,
    data: {
      action: 'UPDATE_QUANTITY',
      itemName,
      newQuantity
    }
  }
}

/**
 * Remove item from invoice
 */
export function removeItem(itemName: string): ActionResult {
  return {
    success: true,
    message: `Removing ${itemName} from invoice`,
    data: {
      action: 'REMOVE_ITEM',
      itemName
    }
  }
}

/**
 * Apply discount
 */
export function applyDiscount(discountPercent: number, itemName?: string): ActionResult {
  if (itemName) {
    return {
      success: true,
      message: `Applying ${discountPercent}% discount to ${itemName}`,
      data: {
        action: 'APPLY_DISCOUNT',
        discountPercent,
        itemName
      }
    }
  }

  return {
    success: true,
    message: `Applying ${discountPercent}% discount to entire invoice`,
    data: {
      action: 'APPLY_DISCOUNT',
      discountPercent
    }
  }
}

/**
 * Set payment mode
 */
export function setPaymentMode(mode: string): ActionResult {
  return {
    success: true,
    message: `Payment mode set to ${mode}`,
    data: {
      action: 'SET_PAYMENT_MODE',
      mode
    }
  }
}

/**
 * Generate/save invoice
 */
export function generateInvoice(params?: { customerData?: any; items?: any[] }): ActionResult {
  return {
    success: true,
    message: 'Generating invoice...',
    data: {
      action: 'GENERATE_INVOICE',
      customerData: params?.customerData,
      items: params?.items
    }
  }
}

/**
 * Show invoice total
 */
export function showInvoiceTotal(): ActionResult {
  return {
    success: true,
    message: 'Showing invoice total',
    data: {
      action: 'SHOW_TOTAL'
    }
  }
}

/**
 * Clear invoice
 */
export function clearInvoice(): ActionResult {
  return {
    success: true,
    message: 'Clearing invoice...',
    data: {
      action: 'CLEAR_INVOICE'
    }
  }
}

/**
 * Start new sale for a customer
 */
export async function newSale(customerName: string): Promise<ActionResult> {
  const result = await searchCustomer(customerName)
  if (result.success && result.data?.selectedCustomer) {
    return {
      success: true,
      message: `✓ New bill started for ${getPartyName(result.data.selectedCustomer)}`,
      data: {
        action: 'NEW_SALE',
        customer: result.data.selectedCustomer
      }
    }
  }
  return {
    success: false,
    message: result.message,
    data: { action: 'NEW_SALE', ...result.data }
  }
}

/**
 * Add multiple items at once
 */
export async function addMultipleItems(items: { name: string; qty: number }[]): Promise<ActionResult> {
  const results = []
  for (const item of items) {
    const result = await addItem(item.name, item.qty)
    results.push({ item: item.name, qty: item.qty, success: result.success })
  }
  const successCount = results.filter(r => r.success).length
  return {
    success: successCount > 0,
    message: `✓ Added ${successCount}/${items.length} items`,
    data: {
      action: 'ADD_MULTIPLE_ITEMS',
      results
    }
  }
}

/**
 * Apply flat discount (rupees)
 */
export function applyFlatDiscount(discountAmount: number): ActionResult {
  return {
    success: true,
    message: `✓ Applied ₹${discountAmount} discount`,
    data: {
      action: 'APPLY_FLAT_DISCOUNT',
      discountAmount
    }
  }
}

/**
 * Round off the bill
 */
export function roundOff(): ActionResult {
  return {
    success: true,
    message: '✓ Bill rounded off',
    data: {
      action: 'ROUND_OFF'
    }
  }
}

/**
 * Send invoice via WhatsApp
 */
export function sendWhatsApp(): ActionResult {
  return {
    success: true,
    message: '📱 Sending via WhatsApp...',
    data: {
      action: 'SEND_WHATSAPP'
    }
  }
}

/**
 * Print invoice
 */
export function printInvoice(): ActionResult {
  return {
    success: true,
    message: '🖨️ Printing invoice...',
    data: {
      action: 'PRINT_INVOICE'
    }
  }
}

/**
 * Remove last added item
 */
export function removeLastItem(): ActionResult {
  return {
    success: true,
    message: '✓ Last item removed',
    data: {
      action: 'REMOVE_LAST_ITEM'
    }
  }
}

/**
 * Toggle GST on/off
 */
export function toggleGST(enabled: boolean): ActionResult {
  return {
    success: true,
    message: enabled ? '✓ GST enabled' : '✓ GST disabled (no tax)',
    data: {
      action: 'TOGGLE_GST',
      enabled
    }
  }
}

/**
 * Execute AI function call
 */
export async function executeAIFunction(
  functionName: string,
  args: Record<string, any>
): Promise<ActionResult> {
  console.log(`🤖 Executing function: ${functionName}`, args)

  try {
    switch (functionName) {
      // New natural commands
      case 'newSale':
        return await newSale(args.customerName)

      case 'addMultipleItems':
        return await addMultipleItems(args.items)

      case 'applyFlatDiscount':
        return applyFlatDiscount(args.discountAmount)

      case 'roundOff':
        return roundOff()

      case 'sendWhatsApp':
        return sendWhatsApp()

      case 'printInvoice':
        return printInvoice()

      case 'removeLastItem':
        return removeLastItem()

      case 'toggleGST':
        return toggleGST(args.enabled)

      // Existing commands
      case 'searchCustomer':
        return await searchCustomer(args.searchQuery)

      case 'addItem':
        return await addItem(args.itemName, args.quantity, args.unit, args.price, args.category, args.brand)

      case 'updateQuantity':
        return updateQuantity(args.itemName, args.newQuantity)

      case 'removeItem':
        return removeItem(args.itemName)

      case 'applyDiscount':
        return applyDiscount(args.discountPercent, args.itemName)

      case 'setPaymentMode':
        return setPaymentMode(args.mode)

      case 'generateInvoice':
        return generateInvoice(args)

      case 'showInvoiceTotal':
        return showInvoiceTotal()

      case 'clearInvoice':
        return clearInvoice()

      case 'showHelp':
        return {
          success: true,
          message: `🎤 Voice Commands:\n• "சிவா க்கு புது பில்" - New sale\n• "மஞ்சள் 1 packet போடு" - Add item\n• "50 ரூபாய் discount" - Discount\n• "save பண்ணு" - Save bill\n• "whatsapp அனுப்பு" - Send WhatsApp`,
          data: { action: 'SHOW_HELP' }
        }

      default:
        return {
          success: false,
          message: `Unknown command: "${functionName}". Try "new sale [name]" or "manjal 1 kg"`
        }
    }
  } catch (error) {
    console.error(`Error executing ${functionName}:`, error)
    return {
      success: false,
      message: `Error: ${functionName}. Please try again.`
    }
  }
}
