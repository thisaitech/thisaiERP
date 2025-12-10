// AI Assistant - Floating voice assistant component
// Supports OpenAI Whisper (better Tamil) and Google Web Speech API
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Microphone,
  MicrophoneSlash,
  X,
  SpeakerHigh,
  SpeakerSlash,
  Sparkle,
  Robot,
  Chat,
  Translate,
  Lightning,
  Gear
} from '@phosphor-icons/react'
import { useVoiceRecognition, type SupportedLanguage, languageNames } from '../hooks/useVoiceRecognition'
import { useWhisperRecognition } from '../hooks/useWhisperRecognition'
import { isWhisperConfigured } from '../services/whisperService'
import { sendMessageToAI, isGeminiConfigured, type AIMessage } from '../services/geminiService'
import { executeAIFunction, type ActionResult } from '../services/aiActionHandler'
import { processVoiceCommand, parseMultipleCommands } from '../services/voiceCommandParser'
import { processConversation } from '../services/conversationalParser'
import { parseNaturalTamil, executeNaturalTamilCommand, getResultSummary } from '../services/naturalTamilParser'
import { useAIAssistant } from '../contexts/AIAssistantContext'
import { cn } from '../lib/utils'
import { toast } from 'sonner'

interface AIAssistantProps {
  onAction?: (action: ActionResult) => void
  isOpen?: boolean
  onClose?: () => void
  hideFloatingButton?: boolean
}

type LanguageCode = 'en' | 'ta' | 'hi' | 'te'

const AIAssistant: React.FC<AIAssistantProps> = ({ onAction, isOpen: controlledIsOpen, onClose, hideFloatingButton = false }) => {
  const { triggerAction } = useAIAssistant()
  const [internalIsOpen, setInternalIsOpen] = useState(false)

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen
  const setIsOpen = (value: boolean) => {
    if (controlledIsOpen !== undefined && onClose && !value) {
      onClose()
    } else {
      setInternalIsOpen(value)
    }
  }
  const [isExpanded, setIsExpanded] = useState(false)
  const [language, setLanguage] = useState<SupportedLanguage>('ta-IN')
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [apiConfigured, setApiConfigured] = useState(false)

  // Voice engine: 'whisper' (OpenAI - better Tamil) or 'google' (Web Speech API)
  const [voiceEngine, setVoiceEngine] = useState<'whisper' | 'google'>(() =>
    localStorage.getItem('voice_engine') as 'whisper' | 'google' || 'whisper'
  )
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)
  const [whisperConfigured, setWhisperConfigured] = useState(isWhisperConfigured())

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Check if APIs are configured
  useEffect(() => {
    setApiConfigured(isGeminiConfigured())
    setWhisperConfigured(isWhisperConfigured())
  }, [])

  // Listen for toggle-ai-assistant event (from mobile bottom nav and AIActionBar)
  useEffect(() => {
    const handleToggleAI = () => {
      setInternalIsOpen(prev => !prev)
    }
    window.addEventListener('toggle-ai-assistant', handleToggleAI)
    return () => {
      window.removeEventListener('toggle-ai-assistant', handleToggleAI)
    }
  }, [])

  // Save voice engine preference
  useEffect(() => {
    localStorage.setItem('voice_engine', voiceEngine)
  }, [voiceEngine])

  // Google Web Speech API hook (fallback)
  const googleVoice = useVoiceRecognition({
    language,
    continuous: true,
    autoRestart: true,
    onResult: async (text, isFinal) => {
      if (voiceEngine === 'google' && isFinal && text.trim()) {
        await handleUserMessage(text.trim())
      }
    },
    onError: (error) => {
      if (voiceEngine === 'google') toast.error(error)
    }
  })

  // OpenAI Whisper hook (better Tamil)
  const whisperVoice = useWhisperRecognition({
    language,
    onResult: async (text) => {
      if (voiceEngine === 'whisper' && text.trim()) {
        await handleUserMessage(text.trim())
      }
    },
    onError: (error) => {
      if (voiceEngine === 'whisper') toast.error(error)
    }
  })

  // Unified voice interface
  const isListening = voiceEngine === 'whisper' ? whisperVoice.isListening : googleVoice.isListening
  const isTranscribing = voiceEngine === 'whisper' ? whisperVoice.isProcessing : false
  const transcript = voiceEngine === 'whisper' ? whisperVoice.transcript : googleVoice.transcript
  const interimTranscript = voiceEngine === 'google' ? googleVoice.interimTranscript : ''
  const isSupported = voiceEngine === 'whisper' ? whisperVoice.isSupported : googleVoice.isSupported
  const isSpeaking = voiceEngine === 'whisper' ? whisperVoice.isSpeaking : googleVoice.isSpeaking
  const speak = voiceEngine === 'whisper' ? whisperVoice.speak : googleVoice.speak

  const startListening = async () => {
    if (voiceEngine === 'whisper') {
      await whisperVoice.startListening()
    } else {
      googleVoice.startListening()
    }
  }

  const stopListening = async () => {
    if (voiceEngine === 'whisper') {
      await whisperVoice.stopListening()
    } else {
      googleVoice.stopListening()
    }
  }

  const resetTranscript = () => {
    if (voiceEngine === 'whisper') {
      whisperVoice.resetTranscript()
    } else {
      googleVoice.resetTranscript()
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle user message
  const handleUserMessage = async (text: string) => {
    // Add user message
    const userMessage: AIMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])
    resetTranscript()
    setIsProcessing(true)

    try {
      const langCode = language.split('-')[0] as LanguageCode

      // Check if this looks like a multi-step command (contains comma, "and", "then")
      const hasMultipleSteps = /,|\s+(?:and|then|மற்றும்|பிறகு|और|फिर|మరియు|తరువాత)\s+/i.test(text)

      // Check if this looks like Tamil shop talk - SUPER FORGIVING NOW!
      // Triggers for ANY of these patterns:
      // - Has Tamil customer suffix (க்கு, க்கோடு, வுக்கு, etc.)
      // - Has save/done markers (சேவ், save, முடி, போடு, etc.)
      // - Has both number and Tamil text
      const isTamilShopTalk = (
        // Has ANY Tamil customer suffix
        /(?:க்கு|கப்|க்கோடு|வுக்கு|ோடு|வு|க்கான)/.test(text) ||
        // OR has save/action markers
        /(?:சேவ்|சேவு|save|முடி|finish|போடு|கொடு|done|add|வாட்சப்|whatsapp)/i.test(text) ||
        // OR has "புது பில்" or "new bill/sale"
        /(?:புது|புதிய|new)\s*(?:பில்|bill|sale)/i.test(text) ||
        // OR has number + Tamil text (likely item)
        /\d+\s+[\u0B80-\u0BFF]/.test(text) ||
        // OR has Tamil text + number
        /[\u0B80-\u0BFF]+\s+\d+/.test(text)
      )

      if (isTamilShopTalk) {
        // USE NEW NATURAL TAMIL PARSER - SUPER FORGIVING!
        console.log('🛒 Tamil shop talk detected - using NATURAL parser')
        console.log('🎤 RAW:', text)

        // Parse using the new forgiving parser
        const parsed = parseNaturalTamil(text)
        console.log('📋 Parsed:', parsed)

        // Execute all commands
        const results = await executeNaturalTamilCommand(text)

        // Trigger each result to Sales page
        for (const result of results) {
          triggerAction(result)
          if (onAction) {
            onAction(result)
          }
          // Small delay for React state updates
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        // Get summary message
        const summaryMessage = getResultSummary(parsed, results)
        const successCount = results.filter(r => r.success).length

        // Add AI response message
        const aiMessage: AIMessage = {
          role: 'assistant',
          content: summaryMessage,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, aiMessage])

        // Speak Tamil summary
        if (autoSpeak) {
          if (parsed.items.length > 0 && parsed.shouldSave) {
            speak(parsed.shouldWhatsApp
              ? 'பில் சேஃப் பண்ணி வாட்ஸ்அப் அனுப்பிட்டேன்'
              : 'பில் சேஃப் ஆச்சு')
          } else if (parsed.items.length > 0) {
            speak(`${parsed.items[0].name} ${parsed.items[0].qty} போட்டேன்`)
          } else if (successCount > 0) {
            speak(`${successCount} செயல் முடிச்சேன்`)
          } else {
            speak('புரியல - சிவாக்கு 1 மஞ்சள் சேவ் பண்ணு சொல்லுங்க')
          }
        }

        // Show final toast
        if (results.length > 0) {
          if (successCount === results.length) {
            toast.success(`✓ ${results.length} actions done!`)
          } else if (successCount > 0) {
            toast.warning(`${successCount}/${results.length} actions completed`)
          } else {
            toast.error('No actions completed - check your command')
          }
        }
      } else if (hasMultipleSteps) {
        // Use conversational parser for multi-step commands
        console.log('🗣️ Using conversational parser')
        const conversationResult = await processConversation(text, langCode)

        // Add AI response message
        const aiMessage: AIMessage = {
          role: 'assistant',
          content: conversationResult.message,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, aiMessage])

        // Speak response if autoSpeak is enabled
        if (autoSpeak) {
          speak(conversationResult.message)
        }

        // Execute all actions
        for (const result of conversationResult.results) {
          if (result) {
            // Trigger action via context so Sales page can listen
            triggerAction(result)

            // Also notify parent component if provided
            if (onAction) {
              onAction(result)
            }

            // Show toast for action result
            if (result.success) {
              toast.success(result.message)
            } else {
              toast.error(result.message)
            }
          }
        }
      } else {
        // Use single-step pattern matching
        console.log('🎯 Using single-step parser')
        console.log('🎤 Raw transcript:', text)
        console.log('🎤 Words:', text.toLowerCase().split(/\s+/))
        const commandResult = await processVoiceCommand(text, langCode)
        console.log('📝 Parser result:', commandResult)

        // Add AI response message
        const aiMessage: AIMessage = {
          role: 'assistant',
          content: commandResult.message,
          timestamp: Date.now()
        }
        setMessages(prev => [...prev, aiMessage])

        // Speak response if autoSpeak is enabled
        if (autoSpeak) {
          speak(commandResult.message)
        }

        // Execute action if found
        if (commandResult.result) {
          // Trigger action via context so Sales page can listen
          triggerAction(commandResult.result)

          // Also notify parent component if provided
          if (onAction) {
            onAction(commandResult.result)
          }

          // Show toast for action result
          if (commandResult.result.success) {
            toast.success(commandResult.result.message)
          } else {
            toast.error(commandResult.result.message)
          }
        }
      }
    } catch (error) {
      console.error('Error processing message:', error)
      const errorMessage = 'Sorry, I encountered an error. Please try again.'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: Date.now()
      }])
      toast.error(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Change language
  const changeLanguage = (newLang: SupportedLanguage) => {
    setLanguage(newLang)
    setShowLanguageMenu(false)
    const langName = languageNames[newLang].native
    toast.success(`Language changed to ${langName}`)
  }

  // Clear chat
  const clearChat = () => {
    setMessages([])
    resetTranscript()
    toast.success('Chat cleared')
  }

  if (!isSupported) {
    return null // Don't render if browser doesn't support speech recognition
  }

  // Render with warning if API not configured (but still allow pattern-matching to work)
  const showApiWarning = !apiConfigured

  return (
    <>
      {/* Floating Button - Hide if controlled externally or hideFloatingButton is true */}
      {!isOpen && !hideFloatingButton && controlledIsOpen === undefined && (
        <motion.div
          className="fixed bottom-6 right-6 z-50"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent shadow-2xl flex items-center justify-center text-white relative overflow-hidden"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkle size={28} weight="duotone" />
            </motion.div>
            <motion.span
              className="absolute inset-0 bg-white"
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {showApiWarning && (
              <span
                className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-white"
                title="Gemini API not configured (basic commands still work)"
              />
            )}
          </button>
        </motion.div>
      )}

      {/* AI Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              'fixed z-50 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden',
              // Mobile: full screen with safe area padding
              'inset-2 bottom-20 lg:inset-auto',
              // Desktop: fixed position and size
              'lg:bottom-6 lg:right-6',
              isExpanded ? 'lg:w-[480px] lg:h-[680px]' : 'lg:w-[380px] lg:h-[520px]'
            )}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-accent p-3 lg:p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkle size={24} weight="duotone" />
                  </motion.div>
                  <h3 className="font-bold text-lg">AI Friend</h3>
                </div>
                <div className="flex items-center gap-2">
                  {/* Language Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="Change Language"
                    >
                      <Translate size={20} weight="bold" />
                    </button>
                    {showLanguageMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-xl p-2 min-w-[150px]"
                      >
                        {Object.entries(languageNames).map(([code, names]) => (
                          <button
                            key={code}
                            onClick={() => changeLanguage(code as SupportedLanguage)}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg transition-colors',
                              language === code
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground hover:bg-muted'
                            )}
                          >
                            {names.native}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Auto-speak toggle */}
                  <button
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title={autoSpeak ? 'Disable Auto-speak' : 'Enable Auto-speak'}
                  >
                    {autoSpeak ? (
                      <SpeakerHigh size={20} weight="bold" />
                    ) : (
                      <SpeakerSlash size={20} weight="bold" />
                    )}
                  </button>

                  {/* Expand/Collapse */}
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Chat size={20} weight="bold" />
                  </button>

                  {/* Close */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={20} weight="bold" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 h-[calc(100%-180px)] max-h-[calc(100vh-280px)] lg:max-h-none">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Robot size={48} weight="duotone" className="mb-3 opacity-50" />
                  <p className="text-sm font-medium">
                    {language === 'ta-IN' && 'பேசுங்க, நான் பில் ready பண்ணிக்கறேன் 👋'}
                    {language === 'hi-IN' && 'बोलिए, मैं बिल बना दूंगा 👋'}
                    {language === 'te-IN' && 'చెప్పండి, నేను బిల్ తయారు చేస్తాను 👋'}
                    {language === 'en-IN' && 'Speak, I\'ll create the bill 👋'}
                  </p>
                  <p className="text-xs mt-1 mb-3">
                    {language === 'ta-IN' && 'உங்க குரல்ல பில் create பண்ணலாம்'}
                    {language === 'hi-IN' && 'आवाज़ से बिल बनाएं'}
                    {language === 'te-IN' && 'మీ గొంతుతో బిల్ సృష్టించండి'}
                    {language === 'en-IN' && 'Create bills with your voice'}
                  </p>
                  {/* Example Commands - Tamil Focused */}
                  <div className="text-left bg-muted/50 rounded-lg p-3 text-[11px] space-y-1 w-full max-w-[280px]">
                    <p className="font-semibold text-foreground text-xs mb-2">
                      {language === 'ta-IN' ? 'இப்படி சொல்லுங்க:' : 'Try saying:'}
                    </p>
                    <p>• <span className="text-primary">"சிவா க்கு புது பில்"</span></p>
                    <p>• <span className="text-primary">"மஞ்சள் 1 packet போடு"</span></p>
                    <p>• <span className="text-primary">"அரிசி 5 கிலோ done"</span></p>
                    <p>• <span className="text-primary">"2 shirt 1 pant போடு"</span></p>
                    <p>• <span className="text-primary">"50 ரூபாய் discount கொடு"</span></p>
                    <p>• <span className="text-primary">"bill round பண்ணு"</span></p>
                    <p>• <span className="text-primary">"save பண்ணு"</span></p>
                    <p>• <span className="text-primary">"whatsapp அனுப்பு"</span></p>
                    <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                      Shiva→Siva, மஞ்சள்→Turmeric - தவறா வந்தாலும் சரியா match பண்ணுவேன்!
                    </p>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex gap-2',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                      <Robot size={18} weight="duotone" className="text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'px-4 py-2 rounded-2xl max-w-[75%]',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </motion.div>
              ))}

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 items-center"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Lightning size={18} weight="duotone" className="text-white" />
                    </motion.div>
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-muted">
                    <div className="flex gap-1">
                      <motion.div
                        className="w-2 h-2 bg-foreground/50 rounded-full"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-foreground/50 rounded-full"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-foreground/50 rounded-full"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Voice Input */}
            <div className="p-4 border-t border-border bg-muted/30">
              {/* Transcript Display */}
              {(transcript || interimTranscript) && (
                <div className="mb-3 p-3 bg-background rounded-lg border border-border">
                  <p className="text-sm text-foreground">
                    {transcript}
                    {interimTranscript && (
                      <span className="text-muted-foreground">{interimTranscript}</span>
                    )}
                  </p>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Microphone Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleListening}
                  disabled={isProcessing || isSpeaking || isTranscribing}
                  className={cn(
                    'flex-1 py-3 px-6 rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2',
                    isTranscribing
                      ? 'bg-yellow-500 text-white'
                      : isListening
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                >
                  {isTranscribing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Lightning size={20} weight="bold" />
                      </motion.div>
                      <span>Processing...</span>
                    </>
                  ) : isListening ? (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Microphone size={20} weight="bold" />
                      </motion.div>
                      <span>{voiceEngine === 'whisper' ? 'Listening...' : 'Stop'}</span>
                    </>
                  ) : (
                    <>
                      <Microphone size={20} weight="bold" />
                      <span>Speak</span>
                    </>
                  )}
                </motion.button>

                {/* Clear Chat */}
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="px-4 py-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
                    title="Clear chat"
                  >
                    <X size={20} weight="bold" />
                  </button>
                )}
              </div>

              {/* Hint */}
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                {isTranscribing ? (
                  <span className="text-yellow-600 font-medium">⏳ Sending to Whisper...</span>
                ) : isListening ? (
                  <span className="text-green-600 font-medium">
                    🎤 {voiceEngine === 'whisper' ? 'Speak now... auto-stops when you pause' : 'Listening... speak now!'}
                  </span>
                ) : voiceEngine === 'whisper' && !whisperConfigured ? (
                  <span className="text-orange-500">⚠️ VITE_OPENAI_API_KEY not set in .env</span>
                ) : (
                  <>
                    {language === 'ta-IN' && 'பொத்தானை அழுத்தி பேசவும்'}
                    {language === 'hi-IN' && 'बोलने के लिए बटन दबाएं'}
                    {language === 'te-IN' && 'మాట్లాడటానికి బటన్ నొక్కండి'}
                    {language === 'en-IN' && 'Press Speak button to start'}
                  </>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AIAssistant
