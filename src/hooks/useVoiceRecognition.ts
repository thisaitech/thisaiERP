// Voice Recognition Hook using Web Speech API
// Supports continuous listening mode for hands-free operation
import { useState, useEffect, useRef, useCallback } from 'react'

export type SupportedLanguage = 'en-IN' | 'ta-IN' | 'hi-IN' | 'te-IN'

interface UseVoiceRecognitionProps {
  language?: SupportedLanguage
  continuous?: boolean
  autoRestart?: boolean // Auto-restart after recognition ends
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

interface UseVoiceRecognitionReturn {
  isListening: boolean
  transcript: string
  interimTranscript: string
  isSupported: boolean
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  speak: (text: string) => void
  isSpeaking: boolean
  toggleContinuousMode: () => void
  isContinuousMode: boolean
}

// Check if browser supports Web Speech API
const isSpeechRecognitionSupported = () => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

const isSpeechSynthesisSupported = () => {
  return 'speechSynthesis' in window
}

export function useVoiceRecognition({
  language = 'en-IN',
  continuous = false,
  autoRestart = false,
  onResult,
  onError
}: UseVoiceRecognitionProps = {}): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isContinuousMode, setIsContinuousMode] = useState(autoRestart)

  const recognitionRef = useRef<any>(null)
  const shouldRestartRef = useRef(false)
  const isSupported = isSpeechRecognitionSupported()

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true // Always use continuous mode for better experience
    recognition.interimResults = true
    recognition.lang = language
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      console.log('🎤 Voice recognition started')
    }

    recognition.onend = () => {
      setIsListening(false)
      console.log('🎤 Voice recognition stopped')

      // Auto-restart if in continuous mode and not manually stopped
      if (shouldRestartRef.current && isContinuousMode) {
        console.log('🎤 Auto-restarting voice recognition...')
        setTimeout(() => {
          try {
            recognition.start()
          } catch (e) {
            console.log('🎤 Could not auto-restart:', e)
          }
        }, 300)
      }
    }

    recognition.onresult = (event: any) => {
      let interimText = ''
      let finalText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcriptText = result[0].transcript

        if (result.isFinal) {
          finalText += transcriptText + ' '
        } else {
          interimText += transcriptText
        }
      }

      if (finalText) {
        setTranscript(prev => prev + finalText)
        setInterimTranscript('')
        onResult?.(finalText.trim(), true)
      } else if (interimText) {
        setInterimTranscript(interimText)
        onResult?.(interimText, false)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error)

      // Don't show error for 'no-speech' in continuous mode - just restart
      if (event.error === 'no-speech' && isContinuousMode) {
        console.log('🎤 No speech detected, continuing to listen...')
        return
      }

      // Don't show error for 'aborted' - this is normal when stopping
      if (event.error === 'aborted') {
        return
      }

      setIsListening(false)

      const errorMessages: Record<string, string> = {
        'no-speech': 'No speech detected. Tap to speak.',
        'audio-capture': 'Microphone not found. Please check your device.',
        'not-allowed': 'Microphone permission denied. Please allow microphone access.',
        'network': 'Network error. Please check your connection.',
        'service-not-allowed': 'Speech recognition service not available.'
      }

      const errorMessage = errorMessages[event.error] || `Speech recognition error: ${event.error}`
      onError?.(errorMessage)
    }

    recognitionRef.current = recognition

    return () => {
      shouldRestartRef.current = false
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {}
      }
    }
  }, [language, isSupported, isContinuousMode])

  // Update onResult and onError callbacks without recreating recognition
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = (event: any) => {
        let interimText = ''
        let finalText = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          const transcriptText = result[0].transcript

          if (result.isFinal) {
            finalText += transcriptText + ' '
          } else {
            interimText += transcriptText
          }
        }

        if (finalText) {
          setTranscript(prev => prev + finalText)
          setInterimTranscript('')
          onResult?.(finalText.trim(), true)
        } else if (interimText) {
          setInterimTranscript(interimText)
          onResult?.(interimText, false)
        }
      }
    }
  }, [onResult])

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.')
      return
    }

    shouldRestartRef.current = true // Enable auto-restart

    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start()
        console.log('🎤 Starting voice recognition...')
      } catch (error) {
        console.error('Error starting speech recognition:', error)
        // If already started, stop and restart
        try {
          recognitionRef.current.stop()
        } catch (e) {}
        setTimeout(() => {
          try {
            recognitionRef.current.start()
          } catch (e) {
            console.error('Failed to restart:', e)
          }
        }, 200)
      }
    }
  }, [isSupported, isListening, onError])

  // Stop listening
  const stopListening = useCallback(() => {
    shouldRestartRef.current = false // Disable auto-restart
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        console.log('🎤 Stopping voice recognition...')
      } catch (e) {}
    }
  }, [])

  // Toggle continuous mode
  const toggleContinuousMode = useCallback(() => {
    setIsContinuousMode(prev => !prev)
  }, [])

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
  }, [])

  // Text to speech
  const speak = useCallback((text: string) => {
    if (!isSpeechSynthesisSupported()) {
      console.warn('Speech synthesis not supported')
      return
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Set language based on current language setting
    const voiceLanguageMap: Record<SupportedLanguage, string> = {
      'en-IN': 'en-IN',
      'ta-IN': 'ta-IN',
      'hi-IN': 'hi-IN',
      'te-IN': 'te-IN'
    }
    utterance.lang = voiceLanguageMap[language] || 'en-IN'

    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      setIsSpeaking(true)
      console.log('🔊 Speaking:', text)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      console.log('🔊 Speech finished')
    }

    utterance.onerror = (event) => {
      console.error('🔊 Speech synthesis error:', event)
      setIsSpeaking(false)
    }

    // Get available voices and try to find the best match
    const voices = window.speechSynthesis.getVoices()
    const languageCode = language.split('-')[0] // e.g., 'ta' from 'ta-IN'

    // Try to find a voice for the selected language
    const matchingVoice = voices.find(voice =>
      voice.lang.startsWith(languageCode) ||
      voice.lang === language
    )

    if (matchingVoice) {
      utterance.voice = matchingVoice
      console.log('🔊 Using voice:', matchingVoice.name, matchingVoice.lang)
    }

    window.speechSynthesis.speak(utterance)
  }, [language])

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    isSpeaking,
    toggleContinuousMode,
    isContinuousMode
  }
}

// Get available voices for a language
export function getAvailableVoices(language: SupportedLanguage): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return []

  const voices = window.speechSynthesis.getVoices()
  const languageCode = language.split('-')[0]

  return voices.filter(voice =>
    voice.lang.startsWith(languageCode) || voice.lang === language
  )
}

// Language display names
export const languageNames: Record<SupportedLanguage, { native: string; english: string }> = {
  'en-IN': { native: 'English', english: 'English' },
  'ta-IN': { native: 'தமிழ்', english: 'Tamil' },
  'hi-IN': { native: 'हिंदी', english: 'Hindi' },
  'te-IN': { native: 'తెలుగు', english: 'Telugu' }
}
