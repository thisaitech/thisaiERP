// Direct Voice Command Parser - No AI needed for basic commands
// Supports Tamil + English mixed commands naturally
import { executeAIFunction, type ActionResult, convertTamilItem, convertTamilUnit, tamilItemMappings, tamilUnitMappings } from './aiActionHandler'

interface ParsedCommand {
  action: string
  params: Record<string, any>
  confidence: number
}

// ========== NATURAL COMMAND PATTERNS ==========
// These handle real shop talk like "new sale siva", "manjal 1 packet podu", etc.

// Common speech-to-text number errors - English + Tamil
const wordToNumber: Record<string, string> = {
  // English variations
  'one': '1', 'won': '1', 'un': '1', 'van': '1',
  'two': '2', 'to': '2', 'too': '2', 'tu': '2',
  'three': '3', 'tree': '3', 'free': '3',
  'four': '4', 'for': '4', 'fore': '4',
  'five': '5', 'fife': '5',
  'six': '6', 'sex': '6',
  'seven': '7',
  'eight': '8', 'ate': '8',
  'nine': '9', 'nein': '9',
  'ten': '10',
  // Tamil numbers
  'ஒரு': '1', 'ஒன்னு': '1', 'ஒன்று': '1', 'onnu': '1', 'oru': '1',
  'ரெண்டு': '2', 'இரண்டு': '2', 'rendu': '2', 'irandu': '2',
  'மூணு': '3', 'மூன்று': '3', 'moonu': '3', 'moondru': '3',
  'நாலு': '4', 'நான்கு': '4', 'naalu': '4', 'naangu': '4',
  'அஞ்சு': '5', 'ஐந்து': '5', 'anju': '5', 'ainthu': '5',
  'ஆறு': '6', 'aaru': '6',
  'ஏழு': '7', 'ezhu': '7',
  'எட்டு': '8', 'ettu': '8',
  'ஒன்பது': '9', 'onbathu': '9',
  'பத்து': '10', 'pathu': '10'
}

/**
 * Normalize text - fix common speech recognition issues
 */
function normalizeTranscript(text: string): string {
  let normalized = text.toLowerCase().trim()

  // Replace word numbers with digits
  // Use space/start/end boundaries instead of \b (which doesn't work with Tamil Unicode)
  for (const [word, num] of Object.entries(wordToNumber)) {
    // Match word at start, end, or surrounded by spaces/Tamil characters
    const pattern = new RegExp(`(^|\\s)${escapeRegex(word)}(\\s|$)`, 'gi')
    normalized = normalized.replace(pattern, `$1${num}$2`)
  }

  // Fix numbers stuck to words (e.g., "1tumeric" → "1 tumeric")
  normalized = normalized.replace(/(\d+)([a-zA-Z])/g, '$1 $2')

  // Fix words stuck to numbers (e.g., "rice2kg" → "rice 2 kg")
  normalized = normalized.replace(/([a-zA-Z])(\d+)/g, '$1 $2')

  // Clean up multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

// Helper to escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parse multiple commands from a single sentence (Tamil shop talk style)
 * Example: "சிவாக்கு புது பில் மஞ்சள் ஒரு பாக்கெட் போடு சேவ் பண்ணு"
 * = New bill for Siva + Add turmeric 1 packet + Save
 */
export function parseMultipleCommands(text: string): ParsedCommand[] {
  const normalized = normalizeTranscript(text)
  console.log('🔄 Multi-command parsing:', normalized)

  const commands: ParsedCommand[] = []
  let remainingText = normalized

  // ===== STEP 1: Extract customer/new bill from the beginning =====
  // Pattern: "[name]க்கு புது பில்" or "new bill [name]" or "புது பில் [name]"
  // Whisper variations: "சிவாகப் புதிய பில்" (கப் instead of க்கு, புதிய instead of புது)
  // Also handles: "சிவாக்கு பில் போடு" where போடு is action word for "create bill"
  // NEW: Also handles "சிவாக்கோடு டெர்மரிக் சேவு" (without பில் keyword)

  // Dative suffixes that indicate "for [customer]" in Tamil
  // Whisper variations: க்கோடு (with), ோடு (with), வுக்கு, கப், etc.
  const dativeSuffixPattern = /(?:க்கு|கப்|உக்கு|க்கான|வுக்கு|வு|வா|க்|கு|க்கோடு|ோடு)$/u

  // First try to find where "புது/புதிய பில்" or "new bill" starts
  // Also consume optional action word (போடு/கொடு/podu) that may follow பில்/bill
  const billStartMatch = remainingText.match(/^(.+?)\s*(?:புது|புதிய|new)?\s*(?:பில்|bill|sale)\s*(?:போடு|கொடு|podu|kodu)?\s*/i)
  if (billStartMatch && billStartMatch[1]) {
    let customerName = billStartMatch[1].trim()
    // Remove Tamil dative suffixes
    customerName = customerName.replace(dativeSuffixPattern, '').trim()

    if (customerName && customerName.length > 0) {
      commands.push({
        action: 'newSale',
        params: { customerName },
        confidence: 0.95
      })
      remainingText = remainingText.replace(billStartMatch[0], '').trim()
      console.log('✓ Found customer (with பில்):', customerName, '| Remaining:', remainingText)
    }
  } else {
    // NEW: Try to extract customer from "[name]க்கோடு/க்கு [item] சேவ்/save" pattern
    // without requiring "பில்" keyword - more natural Tamil speech
    // Example: "சிவாக்கோடு டெர்மரிக் சேவு பண்ணா" = For Siva, turmeric, save
    const naturalTamilMatch = remainingText.match(/^(\S+?)(?:க்கு|கப்|க்கோடு|வுக்கு|ோடு|வு)\s+/i)
    if (naturalTamilMatch && naturalTamilMatch[1]) {
      const customerName = naturalTamilMatch[1].trim()
      if (customerName && customerName.length > 0) {
        commands.push({
          action: 'newSale',
          params: { customerName },
          confidence: 0.9
        })
        remainingText = remainingText.replace(naturalTamilMatch[0], '').trim()
        console.log('✓ Found customer (natural Tamil):', customerName, '| Remaining:', remainingText)
      }
    } else {
      // Fallback patterns for other formats
      const customerPatterns = [
        /^(?:new\s+)?(?:sale|bill)\s+(?:for\s+)?(\w+)\s*/i,
        /^(?:புது|புதிய|new)\s*(?:பில்|bill|sale)\s*(?:for|க்கு|கப்)?\s*(\w+)\s*/i
      ]

      for (const pattern of customerPatterns) {
        const match = remainingText.match(pattern)
        if (match && match[1]) {
          const customerName = match[1].trim()
          commands.push({
            action: 'newSale',
            params: { customerName },
            confidence: 0.95
          })
          remainingText = remainingText.replace(match[0], '').trim()
          console.log('✓ Found customer (fallback):', customerName, '| Remaining:', remainingText)
          break
        }
      }
    }
  }

  // ===== STEP 2: Extract items from the middle =====
  // Pattern: "[item] [qty] [unit] போடு/done" - can have multiple
  // Also: "[qty] [unit] [item]"

  // Tamil action words that indicate end of item command
  // "கொடு" is Whisper's common transcription for "போடு" (give vs add)
  const itemEndMarkers = ['போடு', 'கொடு', 'podu', 'kodu', 'done', 'add', 'சேர்', 'செய்']
  // Save/finish markers - "சேவு" is Whisper's variation of "சேவ்"
  const saveMarkers = ['சேவ்', 'சேவு', 'save', 'முடி', 'finish', 'complete', 'generate', 'பண்ணு', 'பண்ணா']

  // Keep extracting items until we hit save markers or run out of text
  let itemLoopCount = 0
  const maxItems = 10 // Safety limit

  while (remainingText.length > 0 && itemLoopCount < maxItems) {
    itemLoopCount++

    // Check if remaining text STARTS with save marker (not contains!)
    // This prevents "மஞ்சள் 1 பாக்கெட் சேவ் பண்ணு" from breaking early
    const firstWord = remainingText.split(/\s+/)[0]?.toLowerCase() || ''
    const startsWithSave = saveMarkers.some(marker =>
      firstWord === marker || firstWord.startsWith(marker)
    )
    if (startsWithSave) {
      console.log('🛑 Save marker detected at start:', firstWord)
      break
    }

    // Try to extract item: [item] [qty] [unit]
    // Extended pattern to handle Tamil items and units
    // Note: கொடு (kodu/give) is Whisper's common transcription for போடு (podu/add)
    // Unit patterns include Whisper variations: பேக்கெட் (பாக்கெட்), etc.
    const unitPattern = 'kg|kilo|கிலோ|packet|பாக்கெட்|பேக்கெட்|piece|pcs|பீஸ்|meter|மீட்டர்|litre|லிட்டர்|box|பாக்ஸ்|strip|ஸ்ட்ரிப்'
    const itemPatterns = [
      // "மஞ்சள் 1 பாக்கெட் போடு/கொடு" or "மஞ்சள் 1 பாக்கெட்" - item qty unit (action optional)
      new RegExp(`^(\\S+)\\s+(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})\\s*(?:போடு|கொடு|podu|kodu|done|add|சேர்)?\\s*`, 'i'),
      // "மஞ்சள் 1" - item qty (no unit, defaults to pcs)
      /^(\S+)\s+(\d+(?:\.\d+)?)\s*(?:போடு|கொடு|podu|kodu|done|add|சேர்)?\s*/i,
      // "1 kg மஞ்சள்" - qty unit item
      new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${unitPattern})?\\s+(\\S+)\\s*(?:போடு|கொடு|podu|kodu|done|add|சேர்)?\\s*`, 'i'),
      // "மஞ்சள் பாக்கெட்" - item unit (NO QTY - defaults to 1) - common Tamil pattern
      new RegExp(`^(\\S+)\\s+(${unitPattern})\\s*(?:போடு|கொடு|podu|kodu|done|add|சேர்)?\\s*`, 'i'),
      // Just "மஞ்சள் போடு/கொடு" - item action (qty=1)
      /^(\S+)\s+(?:போடு|கொடு|podu|kodu|done|add|சேர்)\s*/i,
      // Pattern 5: Just single item followed by save marker - "டெர்மரிக் சேவு" (qty=1, pcs)
      // This catches items right before save commands without action words
      /^(\S+)\s+(?=சேவ்|சேவு|save|முடி|finish)/i
    ]

    let foundItem = false

    for (let patternIndex = 0; patternIndex < itemPatterns.length; patternIndex++) {
      const pattern = itemPatterns[patternIndex]
      const match = remainingText.match(pattern)
      if (match) {
        let itemName = '', quantity = 1, unit = 'pcs'

        if (patternIndex === 0) {
          // Pattern 0: item qty unit (with unit required)
          itemName = match[1]
          quantity = parseFloat(match[2]) || 1
          unit = match[3] || 'pcs'
        } else if (patternIndex === 1) {
          // Pattern 1: item qty (no unit)
          itemName = match[1]
          quantity = parseFloat(match[2]) || 1
          unit = 'pcs'
        } else if (patternIndex === 2) {
          // Pattern 2: qty unit item
          quantity = parseFloat(match[1]) || 1
          unit = match[2] || 'pcs'
          itemName = match[3]
        } else if (patternIndex === 3) {
          // Pattern 3: item unit (NO QTY - defaults to 1)
          // "மஞ்சள் பாக்கெட்" = turmeric packet (qty 1)
          itemName = match[1]
          quantity = 1
          unit = match[2] || 'pcs'
        } else if (patternIndex === 4) {
          // Pattern 4: item action only ("மஞ்சள் போடு")
          itemName = match[1]
          quantity = 1
          unit = 'pcs'
        } else {
          // Pattern 5: single item before save marker ("டெர்மரிக் சேவு")
          itemName = match[1]
          quantity = 1
          unit = 'pcs'
        }

        // Skip if itemName is a save marker, action word, or common word
        // போடு/கொடு are Tamil action words meaning "add/give" - never item names
        const skipWords = [...saveMarkers, ...itemEndMarkers, 'பண்ணு', 'the', 'and', 'then', 'with']
        if (skipWords.includes(itemName.toLowerCase())) {
          remainingText = remainingText.replace(match[0], '').trim()
          continue
        }

        // Skip if itemName looks like a number (already consumed)
        if (/^\d+$/.test(itemName)) {
          remainingText = remainingText.replace(match[0], '').trim()
          continue
        }

        // Convert Tamil item/unit to English
        itemName = convertTamilItem(itemName)
        unit = convertTamilUnit(unit)

        commands.push({
          action: 'addItem',
          params: { itemName, quantity, unit },
          confidence: 0.9
        })

        remainingText = remainingText.replace(match[0], '').trim()
        console.log('✓ Found item:', itemName, quantity, unit, '| Remaining:', remainingText)
        foundItem = true
        break
      }
    }

    // If no item pattern matched, try to skip unknown word
    if (!foundItem) {
      const firstWord = remainingText.split(/\s+/)[0]
      if (firstWord) {
        remainingText = remainingText.substring(firstWord.length).trim()
      } else {
        break
      }
    }
  }

  // ===== STEP 3: Check for save/finish at the end =====
  // "சேவு" and "பண்ணா" are Whisper variations of "சேவ்" and "பண்ணு"
  const savePatterns = [
    /(?:சேவ்|சேவு|save)\s*(?:பண்ணு|பண்ணா|bill)?/i,
    /(?:முடி|finish|complete|done)\s*(?:பண்ணு|பண்ணா|bill)?/i,
    /(?:generate|create)\s*(?:invoice|bill)?/i
  ]

  for (const pattern of savePatterns) {
    if (pattern.test(remainingText)) {
      commands.push({
        action: 'generateInvoice',
        params: {},
        confidence: 0.95
      })
      console.log('✓ Found save command')
      break
    }
  }

  // ===== STEP 4: Check for WhatsApp send command =====
  // Whisper variations: வாட்சப், வாட்ஸ்அப், whatsapp, வாட்சப்பான்டு (merged)
  const whatsappPatterns = [
    /(?:வாட்சப்|வாட்ஸ்அப்|whatsapp)\s*(?:அனுப்பு|send)?/i,
    /(?:send|அனுப்பு)\s*(?:வாட்சப்|வாட்ஸ்அப்|whatsapp)/i,
    /வாட்சப்பான்/i  // Whisper sometimes merges words like "வாட்சப்பான்டு"
  ]

  for (const pattern of whatsappPatterns) {
    if (pattern.test(remainingText)) {
      commands.push({
        action: 'sendWhatsApp',
        params: {},
        confidence: 0.95
      })
      console.log('✓ Found WhatsApp command')
      break
    }
  }

  console.log('📋 Total commands parsed:', commands.length, commands.map(c => c.action))
  return commands
}

/**
 * Parse natural voice commands (Tamil + English mixed)
 */
export function parseNaturalCommand(text: string): ParsedCommand | null {
  const lowerText = normalizeTranscript(text)
  console.log('🔄 Normalized transcript:', lowerText)

  // ===== NEW SALE / NEW BILL =====
  // "new sale siva", "new bill kumar", "சிவாக்கு புது பில்", "புது பில் siva"

  // First check for Tamil pattern with க்கு attached to name (e.g., "சிவாக்கு புது பில்")
  const tamilNameWithKku = lowerText.match(/^(\S+?)க்கு\s+(?:புது\s*)?(?:பில்|bill|sale)/i)
  if (tamilNameWithKku && tamilNameWithKku[1]) {
    const customerName = tamilNameWithKku[1].trim()
    console.log('🔍 Found Tamil name with க்கு:', customerName)
    return {
      action: 'newSale',
      params: { customerName },
      confidence: 0.95
    }
  }

  const newSalePatterns = [
    // English patterns - stop at common item/action words
    /(?:new\s+)?(?:sale|bill|invoice)\s+(?:for\s+)?(\w+)(?:\s|$)/i,
    // Tamil patterns
    /(?:புது|new)\s*(?:பில்|bill|sale)\s*(?:for|க்கு)?\s*(\w+)/i,
    /(\w+)\s*(?:க்கு|for)\s*(?:புது|new)\s*(?:பில்|bill|sale)/i,
    /start\s+(?:sale|bill|invoice)\s+(?:for\s+)?(\w+)/i
  ]
  for (const pattern of newSalePatterns) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      const customerName = match[1].trim().replace(/\s*(க்கு|for|bill|sale|invoice)$/i, '').trim()
      if (customerName && customerName.length > 1) {
        return {
          action: 'newSale',
          params: { customerName },
          confidence: 0.95
        }
      }
    }
  }

  // ===== ADD ITEM (Tamil + English) =====
  // "manjal 1 packet podu", "மஞ்சள் 2 கிலோ", "turmeric 1 kg done", "2 shirt 1 pant done"
  // Note: கொடு (kodu/give) is Whisper's common transcription for போடு (podu/add)
  const addItemPatterns = [
    // "manjal 1 packet podu/kodu/done"
    /^(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|kilo|கிலோ|packet|பாக்கெட்|piece|pcs|பீஸ்|meter|மீட்டர்|litre|லிட்டர்)?\s*(?:போடு|கொடு|podu|kodu|done|add)?$/i,
    // "1 kg rice", "2 packet manjal"
    /^(\d+(?:\.\d+)?)\s*(kg|kilo|கிலோ|packet|பாக்கெட்|piece|pcs|பீஸ்|meter|மீட்டர்|litre|லிட்டர்)?\s+(?:of\s+)?(.+?)(?:\s+(?:போடு|கொடு|podu|kodu|done|add))?$/i,
    // "add 2 turmeric", "add manjal 1 kg"
    /^(?:add|சேர்|போடு|கொடு)\s+(\d+(?:\.\d+)?)?\s*(.+?)(?:\s+(\d+(?:\.\d+)?))?\s*(kg|கிலோ|packet|பாக்கெட்|pcs|piece)?(?:\s+(?:done|போடு|கொடு))?$/i
  ]

  for (const pattern of addItemPatterns) {
    const match = lowerText.match(pattern)
    if (match) {
      let itemName = '', quantity = 1, unit = 'pcs'

      // Pattern 1: "manjal 1 packet"
      if (match[1] && !match[1].match(/^\d/)) {
        itemName = match[1].trim()
        quantity = parseFloat(match[2]) || 1
        unit = match[3] || 'pcs'
      }
      // Pattern 2: "1 kg rice"
      else if (match[3]) {
        quantity = parseFloat(match[1]) || 1
        unit = match[2] || 'pcs'
        itemName = match[3].trim()
      }
      // Pattern 3: "add 2 turmeric"
      else if (match[2]) {
        quantity = parseFloat(match[1]) || 1
        itemName = match[2].trim()
        unit = match[4] || 'pcs'
      }

      if (itemName) {
        // Convert Tamil item/unit to English
        itemName = convertTamilItem(itemName)
        unit = convertTamilUnit(unit)

        return {
          action: 'addItem',
          params: { itemName, quantity, unit },
          confidence: 0.9
        }
      }
    }
  }

  // ===== MULTIPLE ITEMS IN ONE COMMAND =====
  // "2 shirt 1 pant done", "3 towel 2 bedsheet"
  const multiItemPattern = /(\d+)\s*(\w+)\s+(\d+)\s*(\w+)(?:\s+(?:done|போடு))?/i
  const multiMatch = lowerText.match(multiItemPattern)
  if (multiMatch) {
    const items = [
      { name: convertTamilItem(multiMatch[2]), qty: parseInt(multiMatch[1]) },
      { name: convertTamilItem(multiMatch[4]), qty: parseInt(multiMatch[3]) }
    ]
    return {
      action: 'addMultipleItems',
      params: { items },
      confidence: 0.85
    }
  }

  // ===== DISCOUNT =====
  // "discount 50 rupees", "50 ரூபாய் discount", "5% discount", "discount கொடு 10%"
  const discountPatterns = [
    /(?:discount|தள்ளுபடி)\s*(?:கொடு|give)?\s*(\d+)\s*(?:rupees|ரூபாய்|rs|₹)?/i,
    /(\d+)\s*(?:rupees|ரூபாய்|rs|₹)?\s*(?:discount|தள்ளுபடி)/i,
    /(\d+)\s*(?:%|percent|சதவீதம்)\s*(?:discount|தள்ளுபடி|off)/i,
    /(?:discount|தள்ளுபடி)\s*(\d+)\s*(?:%|percent|சதவீதம்)/i
  ]
  for (const pattern of discountPatterns) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      const isPercent = lowerText.includes('%') || lowerText.includes('percent') || lowerText.includes('சதவீதம்')
      return {
        action: isPercent ? 'applyDiscount' : 'applyFlatDiscount',
        params: isPercent ? { discountPercent: parseInt(match[1]) } : { discountAmount: parseInt(match[1]) },
        confidence: 0.9
      }
    }
  }

  // ===== ROUND OFF =====
  // "round off", "bill round பண்ணு", "round பண்ணு"
  if (/round\s*(?:off|பண்ணு)?|bill\s*round/i.test(lowerText)) {
    return {
      action: 'roundOff',
      params: {},
      confidence: 0.95
    }
  }

  // ===== SAVE BILL =====
  // "save bill", "save பண்ணு", "bill save", "முடி", "done"
  if (/save\s*(?:bill|பண்ணு)?|bill\s*save|முடி|(?:^done$)/i.test(lowerText)) {
    return {
      action: 'generateInvoice',
      params: {},
      confidence: 0.95
    }
  }

  // ===== SEND WHATSAPP =====
  // "send whatsapp", "whatsapp அனுப்பு", "whatsapp send", just "whatsapp"
  // Whisper variations: வாட்சப், வாட்ஸ்அப், வாட்சப்பான்டு (merged), etc.
  if (/whatsapp|வாட்ஸ்அப்|வாட்சப்|வாட்சப்பான்/i.test(lowerText)) {
    return {
      action: 'sendWhatsApp',
      params: {},
      confidence: 0.95
    }
  }

  // ===== PRINT =====
  // "print", "print பண்ணு", "பிரிண்ட்"
  if (/print|பிரிண்ட்|thermal|பில் அச்சு/i.test(lowerText)) {
    return {
      action: 'printInvoice',
      params: {},
      confidence: 0.95
    }
  }

  // ===== PREVIEW BILL =====
  // "preview", "preview bill", "பில் காட்டு"
  if (/preview|காட்டு\s*பில்|பில்\s*காட்டு|show\s*bill/i.test(lowerText)) {
    return {
      action: 'showInvoiceTotal',
      params: {},
      confidence: 0.9
    }
  }

  // ===== CLEAR / NEW BILL =====
  // "clear bill", "bill clear", "new bill", "புது பில்" (without customer)
  if (/^(?:clear|நீக்கு|அழி)\s*(?:bill|பில்)?$|^(?:bill|பில்)\s*(?:clear|நீக்கு)$/i.test(lowerText)) {
    return {
      action: 'clearInvoice',
      params: {},
      confidence: 0.9
    }
  }

  // ===== REMOVE LAST ITEM =====
  // "remove last", "கடைசி item remove", "undo"
  if (/remove\s*(?:last|கடைசி)|(?:கடைசி|last)\s*(?:item)?\s*(?:remove|நீக்கு)|undo/i.test(lowerText)) {
    return {
      action: 'removeLastItem',
      params: {},
      confidence: 0.9
    }
  }

  // ===== NO GST =====
  // "no gst", "gst இல்லாம", "without gst"
  if (/(?:no|without|இல்லாம)\s*gst|gst\s*(?:இல்லாம|off|no)/i.test(lowerText)) {
    return {
      action: 'toggleGST',
      params: { enabled: false },
      confidence: 0.9
    }
  }

  // ===== PAYMENT MODE =====
  // "cash payment", "upi", "card", "bank transfer"
  const paymentModes = ['cash', 'upi', 'card', 'bank', 'cheque', 'credit']
  for (const mode of paymentModes) {
    if (lowerText.includes(mode)) {
      return {
        action: 'setPaymentMode',
        params: { mode },
        confidence: 0.85
      }
    }
  }

  // ===== CHANGE CUSTOMER =====
  // "change customer to siva", "customer மாற்று siva", "இந்த customer மாற்று"
  const changeCustomerPatterns = [
    /(?:change|மாற்று|switch)\s*(?:customer|கஸ்டமர்)\s*(?:to|க்கு)?\s*(.+)/i,
    /(?:customer|கஸ்டமர்)\s*(?:change|மாற்று)\s*(?:to|க்கு)?\s*(.+)/i
  ]
  for (const pattern of changeCustomerPatterns) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      return {
        action: 'newSale',
        params: { customerName: match[1].trim() },
        confidence: 0.9
      }
    }
  }

  // ===== CHANGE QUANTITY =====
  // "quantity 3", "qty change 5", "மாற்று 3 னு"
  const changeQtyPatterns = [
    /(?:quantity|qty|எண்ணிக்கை)\s*(?:change|மாற்று)?\s*(?:to|க்கு)?\s*(\d+)/i,
    /(\d+)\s*(?:னு|க்கு)\s*(?:change|மாற்று)/i
  ]
  for (const pattern of changeQtyPatterns) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      return {
        action: 'updateQuantity',
        params: { newQuantity: parseInt(match[1]) },
        confidence: 0.85
      }
    }
  }

  // ===== REMOVE SPECIFIC ITEM =====
  // "remove turmeric", "manjal remove", "மஞ்சள் நீக்கு"
  const removeItemPatterns = [
    /(?:remove|நீக்கு|delete)\s+(.+?)(?:\s+item)?$/i,
    /(.+?)\s+(?:remove|நீக்கு|delete)$/i
  ]
  for (const pattern of removeItemPatterns) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      const itemToRemove = match[1].trim()
      // Don't match if it's "remove last" or similar
      if (!/^(?:last|கடைசி|all|எல்லாம்)$/i.test(itemToRemove)) {
        return {
          action: 'removeItem',
          params: { itemName: convertTamilItem(itemToRemove) },
          confidence: 0.85
        }
      }
    }
  }

  // ===== HELP COMMANDS =====
  // "help", "what can you do", "commands"
  if (/^(?:help|உதவி|commands|என்ன செய்ய முடியும்)$/i.test(lowerText)) {
    return {
      action: 'showHelp',
      params: {},
      confidence: 0.95
    }
  }

  // ===== FLEXIBLE KEYWORD FALLBACK =====
  // If no pattern matched, try to extract meaning from keywords
  const words = lowerText.split(/\s+/)

  // Look for customer name indicators + any name
  const customerIndicators = ['sale', 'bill', 'customer', 'for', 'க்கு', 'புது', 'new']
  const hasCustomerIndicator = words.some(w => customerIndicators.includes(w))

  // Look for item + quantity pattern anywhere in the text
  const numberMatch = lowerText.match(/(\d+(?:\.\d+)?)/g)
  const hasNumber = numberMatch && numberMatch.length > 0

  // Check if any word is a known item (Tamil or English)
  const allItemKeys = Object.keys(tamilItemMappings)
  const foundItem = words.find(w => allItemKeys.includes(w) || tamilItemMappings[w])

  // If we found an item word with a number, treat as add item
  if (foundItem && hasNumber) {
    const itemName = convertTamilItem(foundItem)
    const quantity = parseFloat(numberMatch![0]) || 1
    // Look for unit
    let unit = 'pcs'
    const unitKeys = Object.keys(tamilUnitMappings)
    const foundUnit = words.find(w => unitKeys.includes(w))
    if (foundUnit) {
      unit = convertTamilUnit(foundUnit)
    }
    console.log('🔍 Fallback: Found item pattern -', { itemName, quantity, unit })
    return {
      action: 'addItem',
      params: { itemName, quantity, unit },
      confidence: 0.7
    }
  }

  // If we found customer indicators with potential name
  if (hasCustomerIndicator) {
    // Filter out common words to find potential customer name
    const commonWords = ['new', 'sale', 'bill', 'for', 'customer', 'புது', 'பில்', 'க்கு', 'the', 'a', 'an', 'to', 'find', 'search', 'show', 'get', 'party', 'client', 'start', 'open', 'create']
    const potentialName = words.filter(w => !commonWords.includes(w) && w.length > 1 && !/^\d+$/.test(w)).join(' ')
    if (potentialName) {
      console.log('🔍 Fallback: Found customer pattern -', potentialName)
      return {
        action: 'newSale',
        params: { customerName: potentialName },
        confidence: 0.6
      }
    }
  }

  return null
}

/**
 * Parse voice command and extract action + parameters
 * This works without AI by using pattern matching
 */
export function parseVoiceCommand(text: string, language: 'en' | 'ta' | 'hi' | 'te' = 'en'): ParsedCommand | null {
  // First try natural command parsing (handles Tamil+English mixed)
  const naturalResult = parseNaturalCommand(text)
  if (naturalResult) {
    return naturalResult
  }

  const lowerText = text.toLowerCase().trim()

  // Command patterns for different languages
  const patterns = {
    // Customer search patterns
    searchCustomer: {
      en: [
        /(?:find|search|show|get)\s+(?:customer|party|client)?\s*(.+)/i,
        /(?:customer|party|client)\s+(.+)/i,
        /who\s+is\s+(.+)/i
      ],
      ta: [
        /(?:கண்டுபிடி|தேடு)\s*(?:வாடிக்கையாளர்|வாடிக்கையாளரை|கஸ்டமர்)?\s*(.+)/i,
        /(.+)\s*(?:வாடிக்கையாளர்|கஸ்டமர்)/i
      ],
      hi: [
        /(?:खोजें|ढूंढें|दिखाएं)\s*(?:ग्राहक|कस्टमर)?\s*(.+)/i,
        /(?:ग्राहक|कस्टमर)\s+(.+)/i
      ],
      te: [
        /(?:కనుగొనండి|శోధించండి)\s*(?:కస్టమర్|వినియోగదారు)?\s*(.+)/i,
        /(.+)\s*(?:కస్టమర్|వినియోగదారు)/i
      ]
    },

    // Add item patterns
    addItem: {
      en: [
        /(?:add|put|insert)\s+(\d+)\s*(?:kg|kgs|piece|pieces|pcs|litre|litres|ltrs|meter|metres|mtr)?\s+(?:of\s+)?(.+)/i,
        /(\d+)\s*(?:kg|kgs|piece|pieces|pcs|litre|litres|ltrs|meter|metres|mtr)\s+(?:of\s+)?(.+)/i,
        /(?:add|put|insert)\s+(?:one|a|an)\s+(.+)/i,
        /(?:add|put|insert)\s+(.+)/i
      ],
      ta: [
        /(?:சேர்|சேர்க்க|போடு)\s*(\d+)\s*(?:கிலோ|கிலோகிராம்|துண்டு|லிட்டர்|மீட்டர்)?\s*(.+)/i,
        /(\d+)\s*(?:கிலோ|கிலோகிராம்|துண்டு|லிட்டர்|மீட்டர்)\s*(.+)/i
      ],
      hi: [
        /(?:जोड़ें|डालें)\s*(\d+)\s*(?:किलो|किलोग्राम|पीस|लीटर|मीटर)?\s*(.+)/i,
        /(\d+)\s*(?:किलो|किलोग्राम|पीस|लीटर|मीटर)\s*(.+)/i
      ],
      te: [
        /(?:జోడించండి|చేర్చండి)\s*(\d+)\s*(?:కిలో|కిలోగ్రాములు|ముక్కలు|లీటర్లు|మీటర్లు)?\s*(.+)/i,
        /(\d+)\s*(?:కిలో|కిలోగ్రాములు|ముక్కలు|లీటర్లు|మీటర్లు)\s*(.+)/i
      ]
    },

    // Discount patterns
    applyDiscount: {
      en: [
        /(?:apply|give|add)\s*(\d+)\s*(?:percent|percentage|%)\s*(?:discount|off)/i,
        /(\d+)\s*(?:percent|percentage|%)\s*(?:discount|off)/i,
        /discount\s*(\d+)\s*(?:percent|percentage|%)?/i
      ],
      ta: [
        /(\d+)\s*(?:சதவீதம்|பர்சென்ட்)\s*(?:தள்ளுபடி|டிஸ்கவுண்ட்)/i,
        /(?:தள்ளுபடி|டிஸ்கவுண்ட்)\s*(\d+)\s*(?:சதவீதம்|பர்சென்ட்)?/i
      ],
      hi: [
        /(\d+)\s*(?:प्रतिशत|परसेंट)\s*(?:छूट|डिस्काउंट)/i,
        /(?:छूट|डिस्काउंट)\s*(\d+)\s*(?:प्रतिशत|परसेंट)?/i
      ],
      te: [
        /(\d+)\s*(?:శాతం|పర్సెంట్)\s*(?:తగ్గింపు|డిస్కౌంట్)/i,
        /(?:తగ్గింపు|డిస్కౌంట్)\s*(\d+)\s*(?:శాతం|పర్సెంట్)?/i
      ]
    },

    // Payment mode patterns
    setPaymentMode: {
      en: [
        /(?:set|change|make)\s*(?:payment|pay)?\s*(?:mode|method)?\s*(?:to|as)?\s*(cash|card|upi|bank|cheque|credit)/i,
        /(?:pay|payment)\s*(?:by|with|in|through)\s*(cash|card|upi|bank|cheque|credit)/i,
        /(cash|card|upi|bank|cheque|credit)\s*(?:payment|pay)/i
      ],
      ta: [
        /(?:பணம்|பேமெண்ட்)\s*(?:மூலம்|செய்)?\s*(காஷ்|கார்டு|யுபிஐ|பேங்க்|செக்)/i,
        /(காஷ்|கார்டு|யுபிஐ|பேங்க்|செக்)\s*(?:மூலம்)?/i
      ],
      hi: [
        /(?:भुगतान|पेमेंट)\s*(?:मोड|तरीका)?\s*(कैश|कार्ड|यूपीआई|बैंक|चेक)/i,
        /(कैश|कार्ड|यूपीआई|बैंक|चेक)\s*(?:से|द्वारा)?/i
      ],
      te: [
        /(?:చెల్లింపు|పేమెంట్)\s*(?:పద్ధతి)?\s*(నగదు|కార్డ్|యూపీఐ|బ్యాంక్|చెక్)/i,
        /(నగదు|కార్డ్|యూపీఐ|బ్యాంక్|చెక్)\s*(?:ద్వారా)?/i
      ]
    },

    // Generate invoice patterns
    generateInvoice: {
      en: [
        /(?:generate|create|make|save|complete|finish)\s*(?:the)?\s*(?:invoice|bill)/i,
        /(?:invoice|bill)\s*(?:done|ready|complete)/i
      ],
      ta: [
        /(?:இன்வாய்ஸ்|பில்)\s*(?:உருவாக்கு|செய்|முடி)/i,
        /(?:உருவாக்கு|செய்|முடி)\s*(?:இன்வாய்ஸ்|பில்)/i
      ],
      hi: [
        /(?:इनवॉइस|बिल|चालान)\s*(?:बनाएं|तैयार|पूर्ण)/i,
        /(?:बनाएं|तैयार|पूर्ण)\s*(?:इनवॉइस|बिल|चालान)/i
      ],
      te: [
        /(?:ఇన్వాయిస్|బిల్)\s*(?:సృష్టించండి|చేయండి|పూర్తి)/i,
        /(?:సృష్టించండి|చేయండి|పూర్తి)\s*(?:ఇన్వాయిస్|బిల్)/i
      ]
    },

    // Show total patterns
    showTotal: {
      en: [
        /(?:show|display|what|tell)\s*(?:is|the)?\s*(?:total|amount|bill)/i,
        /(?:total|amount|bill)\s*(?:is|please)?/i
      ],
      ta: [
        /(?:மொத்தம்|டோட்டல்)\s*(?:காட்டு|சொல்லு|என்ன)/i,
        /(?:காட்டு|சொல்லு)\s*(?:மொத்தம்|டோட்டல்)/i
      ],
      hi: [
        /(?:कुल|टोटल|राशि)\s*(?:दिखाएं|बताएं|क्या)/i,
        /(?:दिखाएं|बताएं)\s*(?:कुल|टोटल|राशि)/i
      ],
      te: [
        /(?:మొత్తం|టోటల్)\s*(?:చూపించు|చెప్పు|ఏమిటి)/i,
        /(?:చూపించు|చెప్పు)\s*(?:మొత్తం|టోటల్)/i
      ]
    },

    // Clear invoice patterns
    clearInvoice: {
      en: [
        /(?:clear|reset|delete|remove|cancel)\s*(?:all|everything|invoice|bill)/i,
        /(?:start|begin)\s*(?:fresh|new|over)/i
      ],
      ta: [
        /(?:அழி|நீக்கு|கிளியர்)\s*(?:எல்லாம்|இன்வாய்ஸ்)/i,
        /(?:புதிதாக|மீண்டும்)\s*(?:தொடங்கு|ஆரம்பி)/i
      ],
      hi: [
        /(?:साफ|हटाएं|रद्द)\s*(?:सब|सभी|इनवॉइस)/i,
        /(?:नया|फिर)\s*(?:शुरू|आरंभ)/i
      ],
      te: [
        /(?:క్లియర్|తొలగించు|రద్దు)\s*(?:అన్ని|ఇన్వాయిస్)/i,
        /(?:కొత్తగా|మళ్ళీ)\s*(?:ప్రారంభించు|మొదలు)/i
      ]
    }
  }

  // Try to match search customer
  for (const pattern of patterns.searchCustomer[language]) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      // Clean up the search query - remove common filler words
      let searchQuery = match[1].trim()
      // Remove "the", "customer", "party", "client" from the beginning
      searchQuery = searchQuery.replace(/^(?:the\s+)?(?:customer|party|client)\s+/i, '')
      // Remove trailing "customer", "party", "client"
      searchQuery = searchQuery.replace(/\s+(?:customer|party|client)$/i, '')

      if (searchQuery) {
        return {
          action: 'searchCustomer',
          params: { searchQuery: searchQuery.trim() },
          confidence: 0.9
        }
      }
    }
  }

  // Try to match add item
  for (const pattern of patterns.addItem[language]) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      let quantity = 1
      let itemName = ''

      // Check if we have two capture groups (quantity + item)
      if (match[2]) {
        quantity = parseInt(match[1])
        itemName = match[2].trim()
      } else {
        // Only one capture group - it's the item name, quantity defaults to 1
        itemName = match[1].trim()
        // Handle "one", "a", "an" explicitly
        if (/^(?:one|a|an)\s+/i.test(itemName)) {
          itemName = itemName.replace(/^(?:one|a|an)\s+/i, '')
        }
      }

      // Extract unit if present
      let unit = 'PCS'
      if (/kg|kilo|kilogram|கிலோ|किலो|కిలో/i.test(text)) unit = 'KGS'
      else if (/litre|liter|லிட்டர்|लीटर|లీటర్/i.test(text)) unit = 'LTRS'
      else if (/meter|metre|மீட்டர்|मीटर|మీటర్/i.test(text)) unit = 'MTR'

      if (itemName) {
        return {
          action: 'addItem',
          params: { itemName, quantity, unit },
          confidence: 0.9
        }
      }
    }
  }

  // Try to match apply discount
  for (const pattern of patterns.applyDiscount[language]) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      return {
        action: 'applyDiscount',
        params: { discountPercent: parseInt(match[1]) },
        confidence: 0.9
      }
    }
  }

  // Try to match payment mode
  for (const pattern of patterns.setPaymentMode[language]) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      const modeMap: Record<string, string> = {
        'cash': 'cash', 'காஷ்': 'cash', 'कैश': 'cash', 'నగదు': 'cash',
        'card': 'card', 'கார்டு': 'card', 'कार्ड': 'card', 'కార్డ్': 'card',
        'upi': 'upi', 'யுபிஐ': 'upi', 'यूपीआई': 'upi', 'యూపీఐ': 'upi',
        'bank': 'bank', 'பேங்க்': 'bank', 'बैंक': 'bank', 'బ్యాంక్': 'bank',
        'cheque': 'cheque', 'செக்': 'cheque', 'चेक': 'cheque', 'చెక్': 'cheque',
        'credit': 'credit'
      }
      const mode = modeMap[match[1].toLowerCase()] || 'cash'
      return {
        action: 'setPaymentMode',
        params: { mode },
        confidence: 0.9
      }
    }
  }

  // Try to match generate invoice
  for (const pattern of patterns.generateInvoice[language]) {
    if (pattern.test(lowerText)) {
      return {
        action: 'generateInvoice',
        params: {},
        confidence: 0.9
      }
    }
  }

  // Try to match show total
  for (const pattern of patterns.showTotal[language]) {
    if (pattern.test(lowerText)) {
      return {
        action: 'showInvoiceTotal',
        params: {},
        confidence: 0.9
      }
    }
  }

  // Try to match clear invoice
  for (const pattern of patterns.clearInvoice[language]) {
    if (pattern.test(lowerText)) {
      return {
        action: 'clearInvoice',
        params: {},
        confidence: 0.9
      }
    }
  }

  return null
}

/**
 * Process voice command directly without AI
 */
export async function processVoiceCommand(
  text: string,
  language: 'en' | 'ta' | 'hi' | 'te' = 'en'
): Promise<{ message: string; result?: ActionResult }> {
  const parsed = parseVoiceCommand(text, language)

  if (!parsed) {
    const messages = {
      en: "I didn't understand that command. Try 'find customer [name]' or 'add [quantity] [item]'",
      ta: "எனக்கு புரியவில்லை. 'வாடிக்கையாளரைக் கண்டுபிடி [பெயர்]' என்று சொல்லுங்கள்",
      hi: "मुझे वह समझ नहीं आया। 'ग्राहक खोजें [नाम]' कहने का प्रयास करें",
      te: "నాకు అర్థం కాలేదు. 'కస్టమర్ కనుగొనండి [పేరు]' అని చెప్పండి"
    }
    return { message: messages[language] }
  }

  // Execute the action
  const result = await executeAIFunction(parsed.action, parsed.params)

  // Generate response message
  const messages = {
    en: result.message,
    ta: result.message, // You can translate these if needed
    hi: result.message,
    te: result.message
  }

  return {
    message: messages[language] || result.message,
    result
  }
}
