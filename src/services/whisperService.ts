// OpenAI Whisper Speech-to-Text Service
// Much better Tamil recognition than Google Web Speech API

const OPENAI_API_URL = 'https://api.openai.com/v1/audio/transcriptions'

export interface WhisperConfig {
  apiKey: string
  model?: 'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe'
  language?: string    // ISO-639-1 code: 'ta' for Tamil, 'en' for English
  prompt?: string      // Optional prompt to guide transcription
}

export interface WhisperResult {
  text: string
  language?: string
  duration?: number
}

// Get API key from environment variable (set in .env as VITE_OPENAI_API_KEY)
export function getWhisperApiKey(): string | null {
  // Use environment variable - no manual setup needed
  const envKey = import.meta.env.VITE_OPENAI_API_KEY
  if (envKey) return envKey

  // Fallback to localStorage for backward compatibility
  return localStorage.getItem('openai_api_key')
}

// Save API key (only used as fallback)
export function setWhisperApiKey(apiKey: string): void {
  localStorage.setItem('openai_api_key', apiKey)
}

// Check if Whisper is configured
export function isWhisperConfigured(): boolean {
  const key = getWhisperApiKey()
  return !!key && (key.startsWith('sk-') || key.length > 20)
}

/**
 * Transcribe audio using OpenAI Whisper API
 * Supports Tamil (ta), English (en), Hindi (hi), Telugu (te)
 */
export async function transcribeAudio(
  audioBlob: Blob,
  config?: Partial<WhisperConfig>
): Promise<WhisperResult> {
  const apiKey = config?.apiKey || getWhisperApiKey()

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add your API key in Settings.')
  }

  // Create form data for multipart upload
  const formData = new FormData()

  // Add audio file - Whisper accepts mp3, mp4, mpeg, mpga, m4a, wav, webm
  const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' })
  formData.append('file', audioFile)

  // Model - try gpt-4o-mini-transcribe first (newer, better), fallback to whisper-1
  formData.append('model', config?.model || 'gpt-4o-mini-transcribe')

  // Language hint - improves accuracy for specific languages
  // 'ta' = Tamil, 'en' = English, 'hi' = Hindi, 'te' = Telugu
  if (config?.language) {
    formData.append('language', config.language)
  }

  // Prompt to guide transcription - helps with domain-specific terms
  const shopPrompt = config?.prompt ||
    'Tamil shop billing conversation. Common words: புது பில், மஞ்சள், பாக்கெட், கிலோ, சேவ் பண்ணு, போடு, சிவா, மீனா, குமார்'
  formData.append('prompt', shopPrompt)

  // Response format
  formData.append('response_format', 'json')

  const modelToUse = config?.model || 'gpt-4o-mini-transcribe'

  try {
    console.log('🎙️ Sending audio to OpenAI transcription API, model:', modelToUse)

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`

      // If gpt-4o-mini-transcribe failed, try whisper-1 as fallback
      if (modelToUse === 'gpt-4o-mini-transcribe' && response.status === 403) {
        console.log('🎙️ gpt-4o-mini-transcribe not available, trying whisper-1...')
        formData.set('model', 'whisper-1')

        const fallbackResponse = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          body: formData
        })

        if (fallbackResponse.ok) {
          const result = await fallbackResponse.json()
          console.log('🎙️ Whisper-1 transcription:', result.text)
          return {
            text: result.text || '',
            language: result.language,
            duration: result.duration
          }
        }
      }

      throw new Error(`OpenAI API error: ${errorMessage}`)
    }

    const result = await response.json()
    console.log('🎙️ Transcription raw:', result.text)

    // Clean transcript - normalize for Tamil shop talk
    const cleanText = cleanWhisperTranscript(result.text || '')
    console.log('🎙️ Transcription cleaned:', cleanText)

    return {
      text: cleanText,
      language: result.language,
      duration: result.duration
    }
  } catch (error) {
    console.error('🎙️ OpenAI API error:', error)
    throw error
  }
}

/**
 * Clean Whisper transcript for better Tamil parsing
 * Normalizes punctuation, numbers, and common variations
 */
function cleanWhisperTranscript(text: string): string {
  let clean = text

  // Replace Tamil number words with digits
  const numberReplacements: Record<string, string> = {
    'ஒன்று': '1', 'ஒன்னு': '1', 'ஒரு': '1',
    'ரெண்டு': '2', 'இரண்டு': '2',
    'மூணு': '3', 'மூன்று': '3',
    'நாலு': '4', 'நான்கு': '4',
    'அஞ்சு': '5', 'ஐந்து': '5'
  }

  for (const [word, num] of Object.entries(numberReplacements)) {
    clean = clean.replace(new RegExp(word, 'gi'), num)
  }

  // Remove punctuation that might confuse parsing
  clean = clean.replace(/[,।.?!。]/g, ' ')

  // Clean up multiple spaces
  clean = clean.replace(/\s+/g, ' ').trim()

  return clean
}

/**
 * Record audio from microphone and transcribe with Whisper
 * Auto-stops when silence is detected (no manual stop needed)
 */
export class WhisperRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private isRecording = false
  private language: string

  // Audio analysis for silence detection
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private silenceCheckInterval: number | null = null
  private silenceStart: number = 0
  private hasSpeechStarted: boolean = false

  // Callbacks for auto-stop
  private onAutoStop: ((result: WhisperResult) => void) | null = null
  private onError: ((error: Error) => void) | null = null

  // Config
  private silenceThreshold = 15        // Audio level below this = silence (0-255)
  private silenceDuration = 1500       // ms of silence before auto-stop
  private minRecordingTime = 500       // Minimum recording time before allowing auto-stop

  constructor(language: string = 'ta') {
    this.language = language
  }

  setLanguage(lang: string) {
    this.language = lang
  }

  /**
   * Start recording with auto-stop on silence
   * @param onAutoStop Callback when recording auto-stops with result
   * @param onError Callback on error
   */
  async startRecording(
    onAutoStop?: (result: WhisperResult) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording')
      return
    }

    this.onAutoStop = onAutoStop || null
    this.onError = onError || null

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      // Set up audio analysis for silence detection
      this.audioContext = new AudioContext()
      const source = this.audioContext.createMediaStreamSource(this.stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)

      // Create MediaRecorder
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg'
      ]

      let selectedMimeType = ''
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType
          break
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMimeType || undefined
      })

      this.audioChunks = []
      this.silenceStart = 0
      this.hasSpeechStarted = false

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100)
      this.isRecording = true

      // Start silence detection
      const recordingStartTime = Date.now()
      this.silenceCheckInterval = window.setInterval(() => {
        if (!this.analyser || !this.isRecording) return

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
        this.analyser.getByteFrequencyData(dataArray)

        // Calculate average audio level
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length

        const now = Date.now()
        const recordingDuration = now - recordingStartTime

        // Check if there's speech (audio above threshold)
        if (average > this.silenceThreshold) {
          this.hasSpeechStarted = true
          this.silenceStart = 0 // Reset silence timer
        } else if (this.hasSpeechStarted && recordingDuration > this.minRecordingTime) {
          // Silence detected after speech started
          if (this.silenceStart === 0) {
            this.silenceStart = now
            console.log('🔇 Silence started...')
          } else if (now - this.silenceStart > this.silenceDuration) {
            // Silence long enough - auto stop
            console.log('🛑 Auto-stopping after', this.silenceDuration, 'ms silence')
            this.autoStopAndProcess()
          }
        }
      }, 100)

      console.log('🎙️ Whisper recording started (auto-stop enabled)')
    } catch (error) {
      console.error('🎙️ Failed to start recording:', error)
      throw error
    }
  }

  private async autoStopAndProcess(): Promise<void> {
    if (!this.isRecording) return

    // Clear silence check
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval)
      this.silenceCheckInterval = null
    }

    try {
      const result = await this.stopRecording()
      if (this.onAutoStop) {
        this.onAutoStop(result)
      }
    } catch (error) {
      if (this.onError) {
        this.onError(error as Error)
      }
    }
  }

  async stopRecording(): Promise<WhisperResult> {
    // Clear silence check
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval)
      this.silenceCheckInterval = null
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Not recording'))
        return
      }

      this.mediaRecorder.onstop = async () => {
        try {
          // Create audio blob from chunks
          const audioBlob = new Blob(this.audioChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm'
          })

          console.log('🎙️ Recording stopped, audio size:', audioBlob.size, 'bytes')

          // Cleanup
          this.stream?.getTracks().forEach(track => track.stop())
          this.stream = null
          this.isRecording = false

          if (this.audioContext) {
            this.audioContext.close()
            this.audioContext = null
          }
          this.analyser = null

          // Transcribe with Whisper
          const result = await transcribeAudio(audioBlob, {
            language: this.language
          })

          resolve(result)
        } catch (error) {
          reject(error)
        }
      }

      this.mediaRecorder.stop()
    })
  }

  cancelRecording(): void {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval)
      this.silenceCheckInterval = null
    }

    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
      this.stream?.getTracks().forEach(track => track.stop())
      this.stream = null
      this.isRecording = false
      this.audioChunks = []

      if (this.audioContext) {
        this.audioContext.close()
        this.audioContext = null
      }
      this.analyser = null

      console.log('🎙️ Recording cancelled')
    }
  }

  getIsRecording(): boolean {
    return this.isRecording
  }
}

// Language code mappings
export const whisperLanguageCodes: Record<string, string> = {
  'ta-IN': 'ta',  // Tamil
  'en-IN': 'en',  // English
  'hi-IN': 'hi',  // Hindi
  'te-IN': 'te'   // Telugu
}
