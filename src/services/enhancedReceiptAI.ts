// Enhanced AI Receipt Scanner - Extracts ALL fields from invoice
// Supports multiple AI providers with complete field extraction

import { ScannedInvoiceData } from '../types'

type AIProvider = 'google' | 'azure' | 'mindee' | 'openai'

// Configuration
const AI_CONFIG = {
  provider: 'openai' as AIProvider, // Changed to OpenAI for better accuracy
  apiKeys: {
    google: import.meta.env.VITE_GOOGLE_VISION_API_KEY || '',
    azure: import.meta.env.VITE_AZURE_FORM_RECOGNIZER_KEY || '',
    mindee: import.meta.env.VITE_MINDEE_API_KEY || '',
    openai: import.meta.env.VITE_OPENAI_API_KEY || ''
  }
}

// ============================================
// GOOGLE CLOUD VISION API - ENHANCED
// ============================================
async function scanWithGoogleVision(imageFile: File): Promise<ScannedInvoiceData> {
  const base64Image = await fileToBase64(imageFile)

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${AI_CONFIG.apiKeys.google}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image.split(',')[1] },
          features: [
            { type: 'DOCUMENT_TEXT_DETECTION' },
            { type: 'TEXT_DETECTION' }
          ]
        }]
      })
    }
  )

  const data = await response.json()

  if (data.error) {
    throw new Error(`Google Vision API Error: ${data.error.message}`)
  }

  const fullText = data.responses[0]?.fullTextAnnotation?.text || ''

  return parseCompleteInvoice(fullText)
}

// ============================================
// OPENAI GPT-4 VISION - ENHANCED (Best for complex invoices)
// ============================================
async function scanWithOpenAI(imageFile: File): Promise<ScannedInvoiceData> {
  const base64Image = await fileToBase64(imageFile)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.apiKeys.openai}`
    },
    body: JSON.stringify({
      model: 'gpt-4o', // Replaced deprecated gpt-4-vision-preview
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract ALL data from this invoice and return as JSON with this EXACT structure:
{
  "vendor": {
    "name": "company name",
    "address": "full address",
    "city": "city",
    "state": "state",
    "pinCode": "PIN code",
    "gstin": "GSTIN number",
    "stateCode": "state code from GSTIN",
    "phone": "phone number",
    "email": "email if present"
  },
  "buyer": {
    "name": "buyer company name",
    "address": "buyer address",
    "city": "buyer city",
    "state": "buyer state",
    "pinCode": "buyer PIN",
    "gstin": "buyer GSTIN",
    "stateCode": "buyer state code"
  },
  "invoiceNumber": "invoice number",
  "invoiceDate": "date in YYYY-MM-DD",
  "deliveryNoteNumber": "delivery note if present",
  "referenceNumber": "reference number if present",
  "buyerOrderNumber": "buyer order number if present",
  "dispatchDocNumber": "dispatch doc number",
  "deliveryNoteDate": "delivery note date",
  "vehicleNumber": "vehicle number",
  "destination": "destination",
  "items": [
    {
      "description": "item description",
      "hsnCode": "HSN code",
      "quantity": number,
      "unit": "unit (KGS, PCS, etc)",
      "rate": number,
      "amount": number
    }
  ],
  "taxableValue": total before tax,
  "cgstRate": CGST percentage,
  "cgstAmount": CGST amount,
  "sgstRate": SGST percentage,
  "sgstAmount": SGST amount,
  "igstRate": IGST percentage if interstate,
  "igstAmount": IGST amount if interstate,
  "totalTaxAmount": total tax,
  "roundOff": round off amount,
  "grandTotal": final amount,
  "paymentMode": "payment mode if mentioned",
  "termsOfPayment": "payment terms if mentioned"
}

Return ONLY the JSON, no markdown, no extra text.`
          },
          {
            type: 'image_url',
            image_url: { url: base64Image }
          }
        ]
      }],
      max_tokens: 2000
    })
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(`OpenAI API Error: ${data.error.message}`)
  }

  const content = data.choices[0].message.content

  // Parse JSON from response (remove markdown code blocks if present)
  let jsonString = content.trim()
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '')
  }

  const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    return parsed as ScannedInvoiceData
  }

  throw new Error('Failed to parse OpenAI response: ' + content)
}

// ============================================
// COMPREHENSIVE TEXT PARSING
// ============================================
function parseCompleteInvoice(text: string): ScannedInvoiceData {
  const lines = text.split('\n').filter(line => line.trim())

  // Initialize result
  const result: ScannedInvoiceData = {
    vendor: {
      name: '',
      address: '',
      city: '',
      state: '',
      pinCode: '',
      gstin: '',
      stateCode: ''
    },
    buyer: {
      name: '',
      address: '',
      city: '',
      state: '',
      pinCode: '',
      gstin: '',
      stateCode: ''
    },
    invoiceNumber: '',
    invoiceDate: '',
    items: [],
    taxableValue: 0,
    cgstRate: 0,
    cgstAmount: 0,
    sgstRate: 0,
    sgstAmount: 0,
    totalTaxAmount: 0,
    roundOff: 0,
    grandTotal: 0
  }

  // Extract GSTIN (format: 33ARKPV1266G2ZL or similar)
  const gstinPattern = /\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]/g
  const gstins = text.match(gstinPattern) || []

  if (gstins[0]) {
    result.vendor.gstin = gstins[0]
    result.vendor.stateCode = gstins[0].substring(0, 2)
  }

  if (gstins[1]) {
    result.buyer!.gstin = gstins[1]
    result.buyer!.stateCode = gstins[1].substring(0, 2)
  }

  // Extract Invoice Number (look for patterns like "322", "INV-001", etc)
  const invoiceNoMatch = text.match(/Invoice\s*No[.:\s]*(\d+|[A-Z]+-\d+)/i) ||
                          text.match(/Invoice\s*[#:]\s*(\S+)/i)
  if (invoiceNoMatch) {
    result.invoiceNumber = invoiceNoMatch[1]
  }

  // Extract Date (DD-MMM-YY format like 28-Aug-25)
  const dateMatch = text.match(/(\d{1,2}[-/]\w{3}[-/]\d{2,4})/) ||
                     text.match(/Dated[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i) ||
                     text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{4})/)
  if (dateMatch) {
    result.invoiceDate = formatDate(dateMatch[1])
  }

  // Extract Vehicle Number (TN11BM6690 format)
  const vehicleMatch = text.match(/([A-Z]{2}\d{2}[A-Z]{1,2}\d{4})/);
  if (vehicleMatch) {
    result.vehicleNumber = vehicleMatch[1]
  }

  // Extract Buyer Order Number
  const buyerOrderMatch = text.match(/Buyer'?s?\s*Order\s*No[.:\s]*(\S+)/i)
  if (buyerOrderMatch) {
    result.buyerOrderNumber = buyerOrderMatch[1]
  }

  // Extract Dispatch Doc No
  const dispatchMatch = text.match(/Dispatch\s*Doc\s*No[.:\s]*(\S+)/i)
  if (dispatchMatch) {
    result.dispatchDocNumber = dispatchMatch[1]
  }

  // Extract Delivery Note
  const deliveryNoteMatch = text.match(/Delivery\s*Note[:\s]*(\S+)/i)
  if (deliveryNoteMatch) {
    result.deliveryNoteNumber = deliveryNoteMatch[1]
  }

  // Extract company names (usually first non-header line and buyer section)
  const vendorNameMatch = text.match(/^([A-Z][A-Z\s.&]+)$/m)
  if (vendorNameMatch) {
    result.vendor.name = vendorNameMatch[1].trim()
  }

  // Extract addresses
  const addressPattern = /S\.No\s+(\d+[^,]+,[^,]+,[^,]+,[^,]+,\s*\d{6})/
  const addresses = text.match(addressPattern)
  if (addresses && addresses[1]) {
    const addrParts = addresses[1].split(',').map(p => p.trim())
    result.vendor.address = addrParts.slice(0, -3).join(', ')
    result.vendor.city = addrParts[addrParts.length - 3] || ''
    result.vendor.state = addrParts[addrParts.length - 2] || ''
    result.vendor.pinCode = addrParts[addrParts.length - 1] || ''
  }

  // Extract HSN codes and items
  const hsnPattern = /(\d{8})\s+([\d.]+)\s*([A-Z]+)\s+([\d.]+)\s+([A-Z]+)\s+([\d,.]+)/g
  let itemMatch
  while ((itemMatch = hsnPattern.exec(text)) !== null) {
    const quantity = parseFloat(itemMatch[2])
    const rate = parseFloat(itemMatch[4])

    result.items.push({
      description: 'Item', // Will be filled from description field
      hsnCode: itemMatch[1],
      quantity: quantity,
      unit: itemMatch[3],
      rate: rate,
      amount: quantity * rate
    })
  }

  // Extract item descriptions (Ms Pipe 91x91x5mm format)
  const itemDescPattern = /^\s*\d+\s+([A-Za-z][A-Za-z\s\d×x]+)/gm
  let descMatch
  let descIndex = 0
  while ((descMatch = itemDescPattern.exec(text)) !== null && descIndex < result.items.length) {
    result.items[descIndex].description = descMatch[1].trim()
    descIndex++
  }

  // Extract tax information
  const cgstMatch = text.match(/CGST[:\s]*([\d.]+)%?[:\s]*([\d,.]+)/i) ||
                     text.match(/OUTPUT\s*CGST[:\s]*([\d,.]+)/i)
  if (cgstMatch) {
    result.cgstRate = 9 // Usually 9% in India
    result.cgstAmount = parseFloat(cgstMatch[cgstMatch.length - 1].replace(/,/g, ''))
  }

  const sgstMatch = text.match(/SGST[:\s]*([\d.]+)%?[:\s]*([\d,.]+)/i) ||
                     text.match(/OUTPUT\s*SGST[:\s]*([\d,.]+)/i)
  if (sgstMatch) {
    result.sgstRate = 9 // Usually 9% in India
    result.sgstAmount = parseFloat(sgstMatch[sgstMatch.length - 1].replace(/,/g, ''))
  }

  // Extract totals
  const taxableMatch = text.match(/Taxable\s*Value[:\s]*([\d,.]+)/i)
  if (taxableMatch) {
    result.taxableValue = parseFloat(taxableMatch[1].replace(/,/g, ''))
  } else if (result.items.length > 0) {
    result.taxableValue = result.items.reduce((sum, item) => sum + item.amount, 0)
  }

  const grandTotalMatch = text.match(/₹\s*([\d,.]+)$/m) ||
                           text.match(/Grand\s*Total[:\s]*₹?\s*([\d,.]+)/i) ||
                           text.match(/Total[:\s]*₹?\s*([\d,.]+)/i)
  if (grandTotalMatch) {
    result.grandTotal = parseFloat(grandTotalMatch[1].replace(/,/g, ''))
  }

  result.totalTaxAmount = result.cgstAmount + result.sgstAmount

  // Calculate round-off
  const roundOffMatch = text.match(/ROUND\s*OFF\s*DIFF[:\s]*([+-]?[\d.]+)/i)
  if (roundOffMatch) {
    result.roundOff = parseFloat(roundOffMatch[1])
  }

  return result
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function formatDate(dateStr: string): string {
  // Convert DD-MMM-YY to YYYY-MM-DD
  try {
    const monthMap: Record<string, string> = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }

    const parts = dateStr.split(/[-/]/)
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0')
      const month = monthMap[parts[1].toLowerCase()] || parts[1].padStart(2, '0')
      let year = parts[2]

      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        year = parseInt(year) > 50 ? `19${year}` : `20${year}`
      }

      return `${year}-${month}-${day}`
    }
  } catch (e) {
    console.error('Date parsing error:', e)
  }

  return new Date().toISOString().split('T')[0]
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export async function scanCompleteInvoice(imageFile: File): Promise<ScannedInvoiceData> {
  // Check if API key is configured
  const apiKey = AI_CONFIG.apiKeys[AI_CONFIG.provider]

  if (!apiKey || apiKey === 'your_google_vision_api_key_here' || apiKey === 'your_openai_api_key_here') {
    throw new Error('⚠️ API Key Not Configured!\n\nPlease add your Google Vision API key to the .env file:\n\n1. Copy .env.example to .env\n2. Add your key: VITE_GOOGLE_VISION_API_KEY=your_key_here\n3. Restart the app\n\nGet free key at: https://cloud.google.com/vision')
  }

  // Use configured provider - DO NOT catch errors here, let them bubble up
  switch (AI_CONFIG.provider) {
    case 'google':
      return await scanWithGoogleVision(imageFile)
    case 'openai':
      return await scanWithOpenAI(imageFile)
    default:
      throw new Error(`Provider ${AI_CONFIG.provider} not implemented`)
  }
}

// Mock data for demonstration (matches S.V. STEELS invoice structure)
function getMockInvoiceData(): ScannedInvoiceData {
  return {
    vendor: {
      name: 'S.V. STEELS',
      address: 'S.No 264, Thiruneermalai Road, Uyalammai Kovil Street',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600044',
      gstin: '33FJLPR7658C1ZS',
      stateCode: '33',
      phone: '',
      email: ''
    },
    buyer: {
      name: 'Dunamis Engineering and Construction Private Limited',
      address: 'No 346/1 B, Kilay Village, Sriperumbudur Taluk',
      city: 'Kanchipuram',
      state: 'Tamil Nadu',
      pinCode: '602105',
      gstin: '33ARKPV1266G2ZL',
      stateCode: '33'
    },
    invoiceNumber: '322',
    invoiceDate: '2025-08-28',
    deliveryNoteNumber: '322',
    buyerOrderNumber: '',
    dispatchDocNumber: '',
    vehicleNumber: 'TN11BM6690',
    destination: '',
    items: [
      {
        description: 'Ms Pipe 91x91x5mm',
        hsnCode: '73066100',
        quantity: 76.00,
        unit: 'KGS',
        rate: 59.00,
        amount: 4484.00
      }
    ],
    taxableValue: 4484.00,
    cgstRate: 9,
    cgstAmount: 403.56,
    sgstRate: 9,
    sgstAmount: 403.56,
    totalTaxAmount: 807.12,
    roundOff: -0.12,
    grandTotal: 5291.00,
    paymentMode: 'Mode/Terms of Payment',
    termsOfPayment: ''
  }
}

export { AI_CONFIG, type ScannedInvoiceData }
