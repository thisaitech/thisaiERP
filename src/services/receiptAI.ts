// AI Receipt Scanner Service
// Supports multiple AI providers: Google Vision, Azure, AWS, Mindee, OpenAI

interface ReceiptData {
  vendor: string
  date: string
  total: number
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  tax?: number
  category?: string
}

type AIProvider = 'google' | 'azure' | 'aws' | 'mindee' | 'openai'

// Configuration
const AI_CONFIG = {
  provider: 'google' as AIProvider, // Change this to switch providers
  apiKeys: {
    google: process.env.VITE_GOOGLE_VISION_API_KEY || '',
    azure: process.env.VITE_AZURE_FORM_RECOGNIZER_KEY || '',
    aws: process.env.VITE_AWS_TEXTRACT_KEY || '',
    mindee: process.env.VITE_MINDEE_API_KEY || '',
    openai: process.env.VITE_OPENAI_API_KEY || ''
  }
}

// ============================================
// GOOGLE CLOUD VISION API
// ============================================
async function scanWithGoogleVision(imageFile: File): Promise<ReceiptData> {
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
            { type: 'TEXT_DETECTION' },
            { type: 'DOCUMENT_TEXT_DETECTION' }
          ]
        }]
      })
    }
  )

  const data = await response.json()
  const text = data.responses[0]?.fullTextAnnotation?.text || ''

  return parseReceiptText(text)
}

// ============================================
// AZURE FORM RECOGNIZER API
// ============================================
async function scanWithAzure(imageFile: File): Promise<ReceiptData> {
  const endpoint = process.env.VITE_AZURE_ENDPOINT || ''
  const apiKey = AI_CONFIG.apiKeys.azure

  const formData = new FormData()
  formData.append('file', imageFile)

  const response = await fetch(
    `${endpoint}/formrecognizer/v2.1/prebuilt/receipt/analyze`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      },
      body: formData
    }
  )

  const operationLocation = response.headers.get('Operation-Location')
  if (!operationLocation) throw new Error('No operation location')

  // Poll for results
  let result
  do {
    await new Promise(resolve => setTimeout(resolve, 1000))
    const resultResponse = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey }
    })
    result = await resultResponse.json()
  } while (result.status === 'running')

  return parseAzureReceipt(result.analyzeResult.documentResults[0].fields)
}

// ============================================
// AWS TEXTRACT API
// ============================================
async function scanWithAWS(imageFile: File): Promise<ReceiptData> {
  // Note: Requires AWS SDK setup
  // This is a placeholder - you'll need to install and configure AWS SDK
  console.log('AWS Textract integration - requires AWS SDK')
  throw new Error('AWS Textract requires SDK setup')
}

// ============================================
// MINDEE RECEIPT OCR API
// ============================================
async function scanWithMindee(imageFile: File): Promise<ReceiptData> {
  const formData = new FormData()
  formData.append('document', imageFile)

  const response = await fetch('https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${AI_CONFIG.apiKeys.mindee}`
    },
    body: formData
  })

  const data = await response.json()
  const prediction = data.document.inference.prediction

  return {
    vendor: prediction.supplier_name?.value || 'Unknown',
    date: prediction.date?.value || new Date().toISOString().split('T')[0],
    total: prediction.total_amount?.value || 0,
    items: prediction.line_items?.map((item: any) => ({
      name: item.description || 'Item',
      quantity: item.quantity || 1,
      price: item.total_amount || 0
    })) || [],
    tax: prediction.total_tax?.value,
    category: prediction.category?.value
  }
}

// ============================================
// OPENAI GPT-4 VISION API
// ============================================
async function scanWithOpenAI(imageFile: File): Promise<ReceiptData> {
  const base64Image = await fileToBase64(imageFile)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_CONFIG.apiKeys.openai}`
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract the following information from this receipt image and return ONLY valid JSON (no markdown, no extra text):
{
  "vendor": "vendor name",
  "date": "YYYY-MM-DD",
  "total": number,
  "items": [{"name": "item name", "quantity": number, "price": number}],
  "tax": number
}`
          },
          {
            type: 'image_url',
            image_url: { url: base64Image }
          }
        ]
      }],
      max_tokens: 1000
    })
  })

  const data = await response.json()
  const content = data.choices[0].message.content

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      ...parsed,
      category: 'General'
    }
  }

  throw new Error('Failed to parse OpenAI response')
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

function parseReceiptText(text: string): ReceiptData {
  // Simple text parsing logic
  const lines = text.split('\n').filter(line => line.trim())

  // Extract vendor (usually first line)
  const vendor = lines[0] || 'Unknown Vendor'

  // Extract date (look for date patterns)
  const dateMatch = text.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})|(\d{4}[-/]\d{1,2}[-/]\d{1,2})/)
  const date = dateMatch ? formatDate(dateMatch[0]) : new Date().toISOString().split('T')[0]

  // Extract total (look for "total" keyword followed by amount)
  const totalMatch = text.match(/total[:\s]*₹?[\s]*(\d+[,\d]*\.?\d*)/i)
  const total = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0

  // Extract items (simple line-by-line parsing)
  const items: Array<{ name: string; quantity: number; price: number }> = []
  lines.forEach(line => {
    const itemMatch = line.match(/(.+?)\s+(\d+)\s+₹?(\d+[,\d]*\.?\d*)/)
    if (itemMatch) {
      items.push({
        name: itemMatch[1].trim(),
        quantity: parseInt(itemMatch[2]),
        price: parseFloat(itemMatch[3].replace(/,/g, ''))
      })
    }
  })

  return { vendor, date, total, items, category: 'General' }
}

function parseAzureReceipt(fields: any): ReceiptData {
  return {
    vendor: fields.MerchantName?.valueString || 'Unknown',
    date: fields.TransactionDate?.valueDate || new Date().toISOString().split('T')[0],
    total: fields.Total?.valueNumber || 0,
    items: fields.Items?.valueArray?.map((item: any) => ({
      name: item.valueObject?.Name?.valueString || 'Item',
      quantity: item.valueObject?.Quantity?.valueNumber || 1,
      price: item.valueObject?.TotalPrice?.valueNumber || 0
    })) || [],
    tax: fields.Tax?.valueNumber,
    category: 'General'
  }
}

function formatDate(dateStr: string): string {
  // Convert various date formats to YYYY-MM-DD
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return new Date().toISOString().split('T')[0]
  return date.toISOString().split('T')[0]
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

export async function scanReceipt(imageFile: File): Promise<ReceiptData> {
  try {
    switch (AI_CONFIG.provider) {
      case 'google':
        return await scanWithGoogleVision(imageFile)
      case 'azure':
        return await scanWithAzure(imageFile)
      case 'aws':
        return await scanWithAWS(imageFile)
      case 'mindee':
        return await scanWithMindee(imageFile)
      case 'openai':
        return await scanWithOpenAI(imageFile)
      default:
        throw new Error('Invalid AI provider')
    }
  } catch (error) {
    console.error('Receipt scanning error:', error)
    // Fallback to mock data for demo
    return {
      vendor: 'Demo Vendor (AI Error)',
      date: new Date().toISOString().split('T')[0],
      total: 0,
      items: [],
      category: 'General'
    }
  }
}

export { AI_CONFIG, type ReceiptData, type AIProvider }
