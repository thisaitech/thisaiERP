// Whisper-based Voice Recognition Hook
// Better Tamil support than Web Speech API
import { useState, useCallback, useRef } from 'react'
import {
  WhisperRecorder,
  isWhisperConfigured,
  whisperLanguageCodes
} from '../services/whisperService'

export type SupportedLanguage = 'en-IN' | 'ta-IN' | 'hi-IN' | 'te-IN'

interface UseWhisperRecognitionProps {
  language?: SupportedLanguage
  onResult?: (transcript: string) => void
  onError?: (error: string) => void
}

interface UseWhisperRecognitionReturn {
  isListening: boolean
  isProcessing: boolean
  transcript: string
  isSupported: boolean
  isConfigured: boolean
  startListening: () => Promise<void>
  stopListening: () => Promise<void>
  cancelListening: () => void
  resetTranscript: () => void
  speak: (text: string) => void
  isSpeaking: boolean
}

export function useWhisperRecognition({
  language = 'ta-IN',
  onResult,
  onError
}: UseWhisperRecognitionProps = {}): UseWhisperRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)

  const recorderRef = useRef<WhisperRecorder | null>(null)

  // Check if browser supports required APIs
  const isSupported = typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices

  const isConfigured = isWhisperConfigured()

  // Start recording with auto-stop on silence
  const startListening = useCallback(async () => {
    if (!isSupported) {
      onError?.('Microphone access not supported in this browser')
      return
    }

    if (!isConfigured) {
      onError?.('OpenAI API key not configured. Please add your API key in Settings.')
      return
    }

    if (isListening || isProcessing) {
      return
    }

    try {
      // Create new recorder with language
      const langCode = whisperLanguageCodes[language] || 'ta'
      recorderRef.current = new WhisperRecorder(langCode)

      // Auto-stop callback - triggered when silence is detected
      const handleAutoStop = (result: { text: string }) => {
        setIsListening(false)
        setIsProcessing(false)

        if (result.text) {
          setTranscript(prev => prev + ' ' + result.text)
          onResult?.(result.text.trim())
          console.log('🎙️ Auto-stop result:', result.text)
        } else {
          console.log('🎙️ No speech detected')
        }
        recorderRef.current = null
      }

      // Error callback
      const handleError = (error: Error) => {
        setIsListening(false)
        setIsProcessing(false)
        console.error('🎙️ Whisper error:', error)
        onError?.(error.message || 'Transcription failed')
        recorderRef.current = null
      }

      await recorderRef.current.startRecording(handleAutoStop, handleError)
      setIsListening(true)
      console.log('🎙️ Whisper listening started (auto-stop on silence)')
    } catch (error: any) {
      console.error('🎙️ Failed to start Whisper recording:', error)

      if (error.name === 'NotAllowedError') {
        onError?.('Microphone permission denied. Please allow microphone access.')
      } else if (error.name === 'NotFoundError') {
        onError?.('No microphone found. Please check your device.')
      } else {
        onError?.(error.message || 'Failed to start recording')
      }
    }
  }, [isSupported, isConfigured, isListening, isProcessing, language, onError, onResult])

  // Stop recording and transcribe
  const stopListening = useCallback(async () => {
    if (!recorderRef.current || !isListening) {
      return
    }

    setIsListening(false)
    setIsProcessing(true)
    console.log('🎙️ Stopping Whisper, processing...')

    try {
      const result = await recorderRef.current.stopRecording()

      if (result.text) {
        setTranscript(prev => prev + ' ' + result.text)
        onResult?.(result.text.trim())
        console.log('🎙️ Whisper result:', result.text)
      } else {
        console.log('🎙️ No speech detected')
      }
    } catch (error: any) {
      console.error('🎙️ Whisper transcription error:', error)

      if (error.message?.includes('API key')) {
        onError?.('Invalid OpenAI API key. Please check your Settings.')
      } else {
        onError?.(error.message || 'Transcription failed')
      }
    } finally {
      setIsProcessing(false)
      recorderRef.current = null
    }
  }, [isListening, onResult, onError])

  // Cancel recording without transcribing
  const cancelListening = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.cancelRecording()
      recorderRef.current = null
    }
    setIsListening(false)
    setIsProcessing(false)
  }, [])

  // Reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  // Text to speech (same as before)
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported')
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Set language for TTS
    const voiceLanguageMap: Record<SupportedLanguage, string> = {
      'en-IN': 'en-IN',
      'ta-IN': 'ta-IN',
      'hi-IN': 'hi-IN',
      'te-IN': 'te-IN'
    }
    utterance.lang = voiceLanguageMap[language] || 'ta-IN'
    utterance.rate = 1.0
    utterance.pitch = 1.0

    utterance.onstart = () => {
      setIsSpeaking(true)
      console.log('🔊 Speaking:', text)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
    }

    // Try to find matching voice
    const voices = window.speechSynthesis.getVoices()
    const langCode = language.split('-')[0]
    const matchingVoice = voices.find(v =>
      v.lang.startsWith(langCode) || v.lang === language
    )
    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

    window.speechSynthesis.speak(utterance)
  }, [language])

  return {
    isListening,
    isProcessing,
    transcript,
    isSupported,
    isConfigured,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
    speak,
    isSpeaking
  }
}

// Language display names
export const languageNames: Record<SupportedLanguage, { native: string; english: string }> = {
  'en-IN': { native: 'English', english: 'English' },
  'ta-IN': { native: 'தமிழ்', english: 'Tamil' },
  'hi-IN': { native: 'हिंदी', english: 'Hindi' },
  'te-IN': { native: 'తెలుగు', english: 'Telugu' }
}
