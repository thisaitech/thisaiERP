// Gemini AI Service for Voice Assistant
import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

if (!API_KEY || API_KEY === 'your_gemini_api_key_here') {
  console.warn('⚠️ Gemini API key not configured. Please add VITE_GEMINI_API_KEY to .env file')
}

// Initialize Gemini AI
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null

// Available functions that AI can call
export interface AIFunction {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
}

// Define available functions for the AI
const availableFunctions: AIFunction[] = [
  {
    name: 'searchCustomer',
    description: 'Search for a customer by name, phone, or email. Use this when user wants to find or select a customer.',
    parameters: {
      type: 'object',
      properties: {
        searchQuery: {
          type: 'string',
          description: 'Customer name, phone number, or email to search for'
        }
      },
      required: ['searchQuery']
    }
  },
  {
    name: 'addItem',
    description: 'Add an item/product to the current invoice. Use this when user wants to add products.',
    parameters: {
      type: 'object',
      properties: {
        itemName: {
          type: 'string',
          description: 'Name of the item/product to add'
        },
        quantity: {
          type: 'number',
          description: 'Quantity of the item'
        },
        unit: {
          type: 'string',
          description: 'Unit of measurement (KGS, PCS, LTRS, etc.)',
          enum: ['KGS', 'PCS', 'LTRS', 'MTR', 'SET', 'BOX', 'PACK']
        }
      },
      required: ['itemName', 'quantity']
    }
  },
  {
    name: 'updateQuantity',
    description: 'Update the quantity of an item already in the invoice',
    parameters: {
      type: 'object',
      properties: {
        itemName: {
          type: 'string',
          description: 'Name of the item to update'
        },
        newQuantity: {
          type: 'number',
          description: 'New quantity value'
        }
      },
      required: ['itemName', 'newQuantity']
    }
  },
  {
    name: 'removeItem',
    description: 'Remove an item from the current invoice',
    parameters: {
      type: 'object',
      properties: {
        itemName: {
          type: 'string',
          description: 'Name of the item to remove'
        }
      },
      required: ['itemName']
    }
  },
  {
    name: 'applyDiscount',
    description: 'Apply a discount to an item or the entire invoice',
    parameters: {
      type: 'object',
      properties: {
        discountPercent: {
          type: 'number',
          description: 'Discount percentage (0-100)'
        },
        itemName: {
          type: 'string',
          description: 'Optional: specific item to apply discount to. If not provided, applies to entire invoice'
        }
      },
      required: ['discountPercent']
    }
  },
  {
    name: 'setPaymentMode',
    description: 'Set the payment mode for the invoice',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'Payment mode',
          enum: ['cash', 'card', 'upi', 'bank', 'cheque', 'credit']
        }
      },
      required: ['mode']
    }
  },
  {
    name: 'generateInvoice',
    description: 'Generate/save the current invoice. Use this when user says to complete, save, or generate the invoice.',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'showInvoiceTotal',
    description: 'Show the current total of the invoice',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'clearInvoice',
    description: 'Clear/reset the current invoice to start fresh',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  }
]

export interface AIMessage {
  role: 'user' | 'assistant' | 'function'
  content: string
  functionCall?: {
    name: string
    arguments: Record<string, any>
  }
  timestamp: number
}

export interface AIResponse {
  message: string
  functionCalls?: Array<{
    name: string
    arguments: Record<string, any>
  }>
  needsUserInput?: boolean
}

// Chat history for context
let chatHistory: AIMessage[] = []

/**
 * Send a message to Gemini AI and get response with function calls
 */
export async function sendMessageToAI(
  userMessage: string,
  language: 'en' | 'ta' | 'hi' | 'te' = 'en'
): Promise<AIResponse> {
  if (!genAI) {
    throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to .env file')
  }

  try {
    // Add user message to history
    chatHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: Date.now()
    })

    // Create model with function calling
    // Using gemini-2.0-flash (confirmed available in your API key)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    })

    // System prompt based on language
    const systemPrompts = {
      en: 'You are a helpful sales assistant for a billing/invoice system. You help users create invoices by finding customers, adding items, applying discounts, and generating invoices. Be concise and friendly. When user mentions customer names or item names, call the appropriate functions.',
      ta: 'நீங்கள் பில்லிங்/இன்வாய்ஸ் அமைப்புக்கான உதவிகரமான விற்பனை உதவியாளர். நீங்கள் வாடிக்கையாளர்களைக் கண்டுபிடித்து, பொருட்களைச் சேர்த்து, தள்ளுபடிகளைப் பயன்படுத்தி, இன்வாய்ஸ்களை உருவாக்க பயனர்களுக்கு உதவுகிறீர்கள். சுருக்கமாகவும் நட்பாகவும் இருங்கள்.',
      hi: 'आप एक बिलिंग/इनवॉइस सिस्टम के लिए एक सहायक बिक्री सहायक हैं। आप उपयोगकर्ताओं को ग्राहकों को खोजने, आइटम जोड़ने, छूट लागू करने और चालान बनाने में मदद करते हैं। संक्षिप्त और मैत्रीपूर्ण रहें।',
      te: 'మీరు బిల్లింగ్/ఇన్వాయిస్ సిస్టమ్ కోసం సహాయక విక్రయాల సహాయకుడు. మీరు వినియోగదారులకు కస్టమర్‌లను కనుగొనడం, అంశాలను జోడించడం, తగ్గింపులను వర్తింపజేయడం మరియు ఇన్‌వాయిస్‌లను రూపొందించడంలో సహాయపడతారు.'
    }

    // Build conversation context
    const conversationContext = chatHistory
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n')

    // Create prompt with function definitions
    const prompt = `${systemPrompts[language]}

Available functions you can call:
${JSON.stringify(availableFunctions, null, 2)}

Conversation history:
${conversationContext}

User: ${userMessage}

Analyze the user's message and determine:
1. What function(s) need to be called (if any)
2. What parameters to pass to each function
3. A friendly response message in ${language === 'ta' ? 'Tamil' : language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English'}

Respond in JSON format:
{
  "message": "your response message",
  "functionCalls": [
    {
      "name": "functionName",
      "arguments": { "param1": "value1" }
    }
  ]
}

If no function needs to be called, return empty functionCalls array.`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Parse JSON response
    let aiResponse: AIResponse
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text
      aiResponse = JSON.parse(jsonText)
    } catch (e) {
      // If parsing fails, treat as plain text response
      aiResponse = {
        message: text,
        functionCalls: []
      }
    }

    // Add AI response to history
    chatHistory.push({
      role: 'assistant',
      content: aiResponse.message,
      timestamp: Date.now()
    })

    return aiResponse
  } catch (error) {
    console.error('Error calling Gemini AI:', error)
    throw error
  }
}

/**
 * Clear chat history
 */
export function clearChatHistory() {
  chatHistory = []
}

/**
 * Get chat history
 */
export function getChatHistory(): AIMessage[] {
  return chatHistory
}

/**
 * Check if API key is configured
 */
export function isGeminiConfigured(): boolean {
  return !!genAI && API_KEY !== 'your_gemini_api_key_here'
}
