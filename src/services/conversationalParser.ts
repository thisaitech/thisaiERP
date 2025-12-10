// Conversational AI Parser - Handles multi-step commands and natural conversation
import { executeAIFunction, type ActionResult } from './aiActionHandler'
import { parseVoiceCommand } from './voiceCommandParser'

interface ConversationStep {
  action: string
  params: Record<string, any>
  order: number
}

/**
 * Parse conversational text into multiple steps
 * Handles commands like: "customer murugan, add 1 mouse, 5% discount, create invoice"
 */
export async function parseConversation(
  text: string,
  language: 'en' | 'ta' | 'hi' | 'te' = 'en'
): Promise<{ message: string; results: ActionResult[] }> {
  const results: ActionResult[] = []
  const steps: ConversationStep[] = []

  // Split by common separators: comma, "and", "then"
  const separators = {
    en: /,|\s+and\s+|\s+then\s+/i,
    ta: /,|\s+மற்றும்\s+|\s+பிறகு\s+/i,
    hi: /,|\s+और\s+|\s+फिर\s+/i,
    te: /,|\s+మరియు\s+|\s+తరువాత\s+/i
  }

  const parts = text.split(separators[language]).map(p => p.trim()).filter(p => p)

  console.log('🗣️ Conversation parts:', parts)

  // Try to parse each part as a command
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const parsed = parseVoiceCommand(part, language)

    if (parsed) {
      steps.push({
        action: parsed.action,
        params: parsed.params,
        order: i
      })
    }
  }

  console.log('📋 Parsed steps:', steps)

  // If no steps found, return error
  if (steps.length === 0) {
    const messages = {
      en: "I didn't understand that. Please try commands like 'find customer [name], add [item], apply discount'",
      ta: "எனக்கு புரியவில்லை. 'வாடிக்கையாளரைக் கண்டுபிடி [பெயர்], [பொருள்] சேர், தள்ளுபடி' போன்ற கட்டளைகளை முயற்சி செய்யுங்கள்",
      hi: "मुझे समझ नहीं आया। 'ग्राहक खोजें [नाम], [वस्तु] जोड़ें, छूट लगाएं' जैसे आदेश आज़माएं",
      te: "నాకు అర్థం కాలేదు. 'కస్టమర్ కనుగొనండి [పేరు], [వస్తువు] జోడించండి, తగ్గింపు వర్తింపజేయండి' వంటి ఆదేశాలను ప్రయత్నించండి"
    }
    return { message: messages[language], results: [] }
  }

  // Execute steps in order
  const actionMessages: string[] = []

  for (const step of steps) {
    console.log(`⚡ Executing step ${step.order + 1}:`, step.action, step.params)

    try {
      const result = await executeAIFunction(step.action, step.params)
      results.push(result)
      actionMessages.push(result.message)
    } catch (error) {
      console.error('Error executing step:', error)
      const errorMsg = `Failed to execute: ${step.action}`
      actionMessages.push(errorMsg)
      results.push({
        success: false,
        message: errorMsg
      })
    }
  }

  // Generate summary message
  const summaryMessages = {
    en: `Completed ${steps.length} actions:\n${actionMessages.join('\n')}`,
    ta: `${steps.length} செயல்கள் முடிந்தன:\n${actionMessages.join('\n')}`,
    hi: `${steps.length} कार्य पूर्ण:\n${actionMessages.join('\n')}`,
    te: `${steps.length} చర్యలు పూర్తయ్యాయి:\n${actionMessages.join('\n')}`
  }

  return {
    message: summaryMessages[language],
    results
  }
}

/**
 * Process conversational command with context
 */
export async function processConversation(
  text: string,
  language: 'en' | 'ta' | 'hi' | 'te' = 'en',
  previousContext?: any
): Promise<{ message: string; results: ActionResult[] }> {
  // First try to parse as a multi-step conversation
  const result = await parseConversation(text, language)

  return result
}
