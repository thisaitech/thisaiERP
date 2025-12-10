// HSN Code Suggestions
// AI-powered HSN code suggestions based on product names
// HSN codes are used in India for goods classification under GST

interface HSNCode {
  code: string
  description: string
  gstRate: number // Common GST rate for this category
  keywords: string[] // Keywords for matching
}

// Comprehensive HSN Code Database for common products
export const HSN_DATABASE: HSNCode[] = [
  // Food & Beverages
  { code: '0401', description: 'Milk and cream', gstRate: 0, keywords: ['milk', 'cream', 'dairy'] },
  { code: '0402', description: 'Milk powder', gstRate: 5, keywords: ['milk powder', 'powdered milk'] },
  { code: '0403', description: 'Curd, Yogurt, Buttermilk', gstRate: 5, keywords: ['curd', 'yogurt', 'yoghurt', 'buttermilk', 'dahi'] },
  { code: '0405', description: 'Butter and dairy spreads', gstRate: 12, keywords: ['butter', 'ghee', 'dairy spread'] },
  { code: '0406', description: 'Cheese', gstRate: 12, keywords: ['cheese', 'paneer'] },
  { code: '0701', description: 'Potatoes', gstRate: 0, keywords: ['potato', 'potatoes', 'aloo'] },
  { code: '0702', description: 'Tomatoes', gstRate: 0, keywords: ['tomato', 'tomatoes'] },
  { code: '0703', description: 'Onions', gstRate: 0, keywords: ['onion', 'onions', 'pyaz'] },
  { code: '0709', description: 'Other vegetables', gstRate: 0, keywords: ['vegetable', 'vegetables', 'sabzi'] },
  { code: '0801', description: 'Coconuts, Brazil nuts', gstRate: 5, keywords: ['coconut', 'nariyal'] },
  { code: '0802', description: 'Almonds, Cashews, Walnuts', gstRate: 5, keywords: ['almond', 'cashew', 'walnut', 'badam', 'kaju'] },
  { code: '1001', description: 'Wheat', gstRate: 0, keywords: ['wheat', 'gehun'] },
  { code: '1006', description: 'Rice', gstRate: 0, keywords: ['rice', 'chawal', 'basmati'] },
  { code: '1701', description: 'Sugar', gstRate: 5, keywords: ['sugar', 'chini'] },
  { code: '1704', description: 'Chocolates and confectionery', gstRate: 28, keywords: ['chocolate', 'candy', 'sweet', 'confectionery', 'toffee'] },
  { code: '1905', description: 'Bread, Biscuits, Cakes', gstRate: 18, keywords: ['bread', 'biscuit', 'cookie', 'cake', 'pastry', 'rusk'] },
  { code: '2009', description: 'Fruit juices', gstRate: 12, keywords: ['juice', 'fruit juice'] },
  { code: '2101', description: 'Coffee, Tea extracts', gstRate: 18, keywords: ['coffee', 'tea', 'chai'] },
  { code: '2106', description: 'Food preparations', gstRate: 18, keywords: ['instant mix', 'ready to eat', 'packaged food'] },
  { code: '2201', description: 'Water (packaged)', gstRate: 18, keywords: ['water', 'mineral water', 'packaged water'] },
  { code: '2202', description: 'Soft drinks', gstRate: 28, keywords: ['soft drink', 'soda', 'cola', 'pepsi', 'cold drink'] },

  // Stationery & Office Supplies
  { code: '4802', description: 'Paper (uncoated)', gstRate: 12, keywords: ['paper', 'a4', 'copier paper', 'printing paper'] },
  { code: '4820', description: 'Notebooks, registers', gstRate: 12, keywords: ['notebook', 'register', 'diary', 'notepad', 'copy'] },
  { code: '9608', description: 'Pens, markers', gstRate: 18, keywords: ['pen', 'ballpoint', 'marker', 'sketch pen', 'gel pen'] },
  { code: '9609', description: 'Pencils', gstRate: 12, keywords: ['pencil'] },
  { code: '3919', description: 'Adhesive tape', gstRate: 18, keywords: ['tape', 'cello tape', 'adhesive tape', 'scotch tape'] },
  { code: '4811', description: 'Paper products', gstRate: 12, keywords: ['envelope', 'paper bag'] },
  { code: '9017', description: 'Rulers, measuring instruments', gstRate: 18, keywords: ['ruler', 'scale', 'geometry box'] },
  { code: '3926', description: 'Plastic items', gstRate: 18, keywords: ['plastic folder', 'file cover'] },

  // Electronics & Computers
  { code: '8471', description: 'Computers, laptops', gstRate: 18, keywords: ['computer', 'laptop', 'desktop', 'pc', 'notebook'] },
  { code: '8473', description: 'Computer parts & accessories', gstRate: 18, keywords: ['keyboard', 'mouse', 'ram', 'hard disk', 'ssd'] },
  { code: '8517', description: 'Mobile phones', gstRate: 18, keywords: ['mobile', 'phone', 'smartphone', 'cell phone'] },
  { code: '8518', description: 'Speakers, headphones', gstRate: 18, keywords: ['speaker', 'headphone', 'earphone', 'microphone', 'headset'] },
  { code: '8528', description: 'Monitors, TVs', gstRate: 18, keywords: ['monitor', 'tv', 'television', 'display', 'led tv'] },
  { code: '8443', description: 'Printers, scanners', gstRate: 18, keywords: ['printer', 'scanner', 'photocopier', 'copier'] },
  { code: '8504', description: 'Chargers, adapters, UPS', gstRate: 18, keywords: ['charger', 'adapter', 'ups', 'power supply'] },
  { code: '8523', description: 'Pen drives, memory cards', gstRate: 18, keywords: ['pen drive', 'usb', 'memory card', 'sd card', 'flash drive'] },
  { code: '8544', description: 'Cables, wires', gstRate: 18, keywords: ['cable', 'wire', 'hdmi', 'usb cable', 'data cable'] },

  // Furniture & Home
  { code: '9403', description: 'Furniture', gstRate: 18, keywords: ['chair', 'table', 'desk', 'furniture', 'sofa', 'bed', 'cabinet', 'shelf'] },
  { code: '9404', description: 'Mattress, cushions', gstRate: 18, keywords: ['mattress', 'cushion', 'pillow'] },
  { code: '6302', description: 'Bed linen, curtains', gstRate: 5, keywords: ['bed sheet', 'curtain', 'pillow cover', 'bed linen'] },
  { code: '6910', description: 'Ceramic items', gstRate: 12, keywords: ['ceramic', 'tiles', 'pottery'] },
  { code: '7013', description: 'Glassware', gstRate: 18, keywords: ['glass', 'glassware', 'tumbler'] },
  { code: '7323', description: 'Steel utensils', gstRate: 18, keywords: ['steel', 'utensils', 'plate', 'bowl', 'spoon'] },
  { code: '8516', description: 'Electric appliances', gstRate: 18, keywords: ['heater', 'iron', 'toaster', 'kettle', 'water heater', 'geyser'] },

  // Clothing & Textiles
  { code: '6101', description: 'Men\'s coats, jackets', gstRate: 12, keywords: ['coat', 'jacket', 'blazer'] },
  { code: '6104', description: 'Women\'s suits, dresses', gstRate: 12, keywords: ['dress', 'suit', 'kurti', 'saree'] },
  { code: '6109', description: 'T-shirts', gstRate: 5, keywords: ['t-shirt', 'tshirt', 'tee'] },
  { code: '6110', description: 'Sweaters, pullovers', gstRate: 12, keywords: ['sweater', 'pullover', 'cardigan'] },
  { code: '6203', description: 'Men\'s shirts, trousers', gstRate: 12, keywords: ['shirt', 'trouser', 'pant'] },
  { code: '6211', description: 'Track suits, sports wear', gstRate: 12, keywords: ['tracksuit', 'sportswear', 'gym wear'] },
  { code: '6402', description: 'Footwear', gstRate: 5, keywords: ['shoe', 'footwear', 'sandal', 'slipper', 'chappal'] },
  { code: '6505', description: 'Hats, caps', gstRate: 12, keywords: ['hat', 'cap'] },

  // Beauty & Personal Care
  { code: '3303', description: 'Perfumes', gstRate: 28, keywords: ['perfume', 'fragrance', 'cologne', 'deo', 'deodorant'] },
  { code: '3304', description: 'Makeup, cosmetics', gstRate: 28, keywords: ['makeup', 'cosmetic', 'lipstick', 'foundation', 'kajal'] },
  { code: '3305', description: 'Hair care', gstRate: 28, keywords: ['shampoo', 'conditioner', 'hair oil', 'hair gel'] },
  { code: '3306', description: 'Toothpaste, oral care', gstRate: 18, keywords: ['toothpaste', 'toothbrush', 'mouthwash', 'dental'] },
  { code: '3307', description: 'Shaving products, deodorants', gstRate: 28, keywords: ['razor', 'shaving cream', 'aftershave'] },
  { code: '3401', description: 'Soap', gstRate: 18, keywords: ['soap', 'bathing soap', 'hand wash'] },
  { code: '3402', description: 'Detergents', gstRate: 28, keywords: ['detergent', 'washing powder', 'liquid detergent'] },
  { code: '4901', description: 'Books', gstRate: 0, keywords: ['book', 'textbook', 'novel'] },
  { code: '4902', description: 'Newspapers, magazines', gstRate: 0, keywords: ['newspaper', 'magazine'] },

  // Medical & Healthcare
  { code: '3004', description: 'Medicines', gstRate: 12, keywords: ['medicine', 'tablet', 'capsule', 'drug', 'pharmaceutical'] },
  { code: '3005', description: 'Bandages, first aid', gstRate: 12, keywords: ['bandage', 'gauze', 'cotton', 'first aid'] },
  { code: '3006', description: 'Medical equipment', gstRate: 12, keywords: ['syringe', 'thermometer', 'glucometer'] },
  { code: '9018', description: 'Medical instruments', gstRate: 12, keywords: ['stethoscope', 'bp monitor', 'medical instrument'] },
  { code: '9021', description: 'Orthopaedic appliances', gstRate: 12, keywords: ['wheelchair', 'crutch', 'walking stick'] },

  // Automotive
  { code: '8703', description: 'Motor cars', gstRate: 28, keywords: ['car', 'automobile', 'vehicle'] },
  { code: '8711', description: 'Motorcycles', gstRate: 28, keywords: ['motorcycle', 'bike', 'scooter', 'two wheeler'] },
  { code: '4011', description: 'Tyres', gstRate: 28, keywords: ['tyre', 'tire'] },
  { code: '8708', description: 'Auto parts', gstRate: 28, keywords: ['auto parts', 'spare parts', 'car parts'] },
  { code: '2710', description: 'Petroleum products', gstRate: 18, keywords: ['engine oil', 'lubricant', 'grease'] },

  // Sports & Toys
  { code: '9503', description: 'Toys', gstRate: 12, keywords: ['toy', 'doll', 'action figure', 'puzzle'] },
  { code: '9506', description: 'Sports equipment', gstRate: 18, keywords: ['cricket', 'bat', 'ball', 'badminton', 'football', 'sports'] },
  { code: '9507', description: 'Fishing equipment', gstRate: 18, keywords: ['fishing rod', 'fishing'] },

  // Jewellery & Precious metals
  { code: '7113', description: 'Jewellery', gstRate: 3, keywords: ['jewellery', 'jewelry', 'gold', 'silver', 'necklace', 'ring'] },
  { code: '7108', description: 'Gold', gstRate: 3, keywords: ['gold', 'sona'] },
  { code: '7106', description: 'Silver', gstRate: 3, keywords: ['silver', 'chandi'] },

  // Construction & Hardware
  { code: '6907', description: 'Ceramic tiles', gstRate: 28, keywords: ['tiles', 'ceramic tiles', 'floor tiles'] },
  { code: '7214', description: 'Iron & steel bars', gstRate: 18, keywords: ['iron', 'steel', 'rod', 'tmt'] },
  { code: '7308', description: 'Steel structures', gstRate: 18, keywords: ['steel structure', 'metal frame'] },
  { code: '8302', description: 'Door fittings, handles', gstRate: 18, keywords: ['handle', 'lock', 'hinge', 'door fitting'] },
  { code: '8481', description: 'Taps, valves', gstRate: 18, keywords: ['tap', 'faucet', 'valve'] },
  { code: '3816', description: 'Cement', gstRate: 28, keywords: ['cement'] },
  { code: '2523', description: 'Cement (Portland)', gstRate: 28, keywords: ['portland cement'] },

  // Electrical
  { code: '8536', description: 'Switches, sockets', gstRate: 18, keywords: ['switch', 'socket', 'electrical switch'] },
  { code: '8539', description: 'LED bulbs, lamps', gstRate: 18, keywords: ['bulb', 'led', 'lamp', 'tube light', 'light'] },
  { code: '8540', description: 'CFL bulbs', gstRate: 18, keywords: ['cfl', 'bulb'] },

  // Packaging
  { code: '4819', description: 'Cartons, boxes', gstRate: 18, keywords: ['carton', 'box', 'cardboard box', 'packaging'] },
  { code: '3923', description: 'Plastic containers', gstRate: 18, keywords: ['plastic container', 'plastic box'] },

  // Agriculture
  { code: '3101', description: 'Fertilizers', gstRate: 5, keywords: ['fertilizer', 'urea', 'dap'] },
  { code: '8432', description: 'Agricultural machinery', gstRate: 12, keywords: ['tractor', 'harvester', 'plough'] },
]

/**
 * Get HSN code suggestions based on product name
 * Uses AI-like keyword matching and relevance scoring
 */
export function getHSNSuggestions(productName: string, maxSuggestions: number = 5): HSNCode[] {
  if (!productName || productName.trim().length < 2) {
    return []
  }

  const searchTerms = productName.toLowerCase().trim().split(/\s+/)

  // Score each HSN code based on keyword matches
  const scoredResults = HSN_DATABASE.map(hsn => {
    let score = 0

    // Check each keyword in the HSN database
    hsn.keywords.forEach(keyword => {
      searchTerms.forEach(term => {
        // Exact match
        if (keyword === term) {
          score += 10
        }
        // Starts with
        else if (keyword.startsWith(term) || term.startsWith(keyword)) {
          score += 7
        }
        // Contains
        else if (keyword.includes(term) || term.includes(keyword)) {
          score += 3
        }
      })
    })

    // Check description match
    const descLower = hsn.description.toLowerCase()
    searchTerms.forEach(term => {
      if (descLower.includes(term)) {
        score += 2
      }
    })

    return { ...hsn, score }
  })

  // Filter only items with score > 0 and sort by score
  return scoredResults
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
}

/**
 * Get HSN code details by code
 */
export function getHSNByCode(code: string): HSNCode | undefined {
  return HSN_DATABASE.find(hsn => hsn.code === code)
}

/**
 * Get common GST rate for an HSN code
 */
export function getGSTRateForHSN(hsnCode: string): number {
  const hsn = getHSNByCode(hsnCode)
  return hsn ? hsn.gstRate : 18 // Default to 18% if not found
}

/**
 * Format HSN code for display
 */
export function formatHSNCode(code: string): string {
  // Format as XXXX or XXXX.XX depending on length
  if (code.length === 4) return code
  if (code.length === 6) return `${code.slice(0, 4)}.${code.slice(4)}`
  if (code.length === 8) return `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6)}`
  return code
}
