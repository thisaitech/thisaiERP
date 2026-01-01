// BarcodeScanner.tsx - Anna 2025
// Barcode/QR code scanner component using html5-qrcode

import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Barcode, Lightning, Keyboard } from '@phosphor-icons/react'
import { cn } from '../lib/utils'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (barcode: string) => void
  title?: string
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode'
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [hasCamera, setHasCamera] = useState(true)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const manualInputRef = useRef<HTMLInputElement>(null)
  // Use a fixed ID - simpler and more reliable
  const scannerId = 'barcode-scanner-view'

  // Check if device has camera on mount and detect mobile
  useEffect(() => {
    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    setIsMobileDevice(isMobile)

    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(device => device.kind === 'videoinput')
        setHasCamera(videoDevices.length > 0)
        // If no camera, default to manual entry
        if (videoDevices.length === 0) {
          setManualEntry(true)
        }
      } catch {
        // If we can't enumerate devices, assume no camera
        setHasCamera(false)
        setManualEntry(true)
      }
    }
    checkCamera()
  }, [])

  useEffect(() => {
    if (isOpen && !manualEntry && hasCamera) {
      // Reset states when opening
      setError(null)
      setIsInitializing(true)
      setIsScanning(false)

      // Small delay to ensure DOM element is rendered
      const timer = setTimeout(() => {
        startScanner()
      }, 500)
      return () => clearTimeout(timer)
    }

    // Auto-focus manual input when in manual mode
    if (isOpen && manualEntry) {
      setTimeout(() => {
        manualInputRef.current?.focus()
      }, 100)
    }

    return () => {
      stopScanner()
    }
  }, [isOpen, manualEntry, hasCamera])

  const startScanner = async () => {
    try {
      setError(null)
      setIsInitializing(true)

      // Check if element exists
      const scannerElement = document.getElementById(scannerId)
      if (!scannerElement) {
        console.error('Scanner element not found:', scannerId)
        // Try again after another delay
        setTimeout(() => {
          const retryElement = document.getElementById(scannerId)
          if (retryElement) {
            startScanner()
          } else {
            setError('Scanner initialization failed. Please use manual entry.')
            setIsInitializing(false)
          }
        }, 500)
        return
      }

      // Stop any existing scanner first
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
          await scannerRef.current.clear()
        } catch {
          // Ignore cleanup errors
        }
        scannerRef.current = null
      }

      // Request camera permission explicitly first (important for Android WebView/PWA)
      try {
        console.log('Requesting camera permission...')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        // Stop the stream immediately - we just needed to trigger permission
        stream.getTracks().forEach(track => track.stop())
        console.log('Camera permission granted')
      } catch (permErr: any) {
        console.error('Camera permission error:', permErr)
        if (permErr.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access in your browser/app settings.')
          setIsInitializing(false)
          return
        }
        // Continue anyway - html5-qrcode might handle it
      }

      // Create scanner instance with all common barcode formats
      const html5QrCode = new Html5Qrcode(scannerId, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.PDF_417
        ]
      })
      scannerRef.current = html5QrCode

      // Detect if mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      // Get available cameras and prefer back camera
      let cameraId: string | { facingMode: string } = { facingMode: 'environment' }
      try {
        const cameras = await Html5Qrcode.getCameras()
        console.log('Available cameras:', cameras)
        if (cameras && cameras.length > 0) {
          // Find back camera (usually contains 'back' or 'rear' or 'environment' in label)
          const backCamera = cameras.find(c =>
            c.label.toLowerCase().includes('back') ||
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment')
          )
          if (backCamera) {
            cameraId = backCamera.id
            console.log('Using back camera:', backCamera.label)
          } else {
            // Use first camera if no back camera found
            cameraId = cameras[0].id
            console.log('Using first available camera:', cameras[0].label)
          }
        }
      } catch (camErr) {
        console.log('Could not enumerate cameras, using facingMode constraint')
      }

      const config = {
        fps: isMobile ? 10 : 20, // Lower FPS on mobile for better performance
        // On mobile, use a defined qrbox for better scanning accuracy
        // On desktop, scan entire frame
        qrbox: isMobile ? { width: 280, height: 150 } : { width: 300, height: 200 },
        aspectRatio: isMobile ? 1.777778 : 1.0, // 16:9 for mobile, 1:1 for desktop
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      }

      console.log('Starting camera scanner with config:', config, 'cameraId:', cameraId)

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          console.log('Barcode detected:', decodedText)
          // Vibrate for feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(100)
          }
          // Play a beep sound
          playBeep()
          // Stop scanning and return result
          stopScanner()
          onScan(decodedText)
          onClose()
        },
        () => {
          // Ignore QR error - scanning continues
        }
      )

      console.log('Camera scanner started successfully')
      setIsScanning(true)
      setIsInitializing(false)

      // Check if torch is available
      try {
        const capabilities = html5QrCode.getRunningTrackCameraCapabilities()
        if (capabilities && capabilities.torchFeature && capabilities.torchFeature().isSupported()) {
          setHasTorch(true)
        }
      } catch {
        // Torch not supported
      }
    } catch (err: any) {
      console.error('Scanner error:', err)
      setIsInitializing(false)
      setIsScanning(false)

      // For no camera or permission denied, automatically switch to manual entry
      if (err.message?.includes('not found') || err.name === 'NotFoundError') {
        console.log('No camera found, switching to manual entry')
        setManualEntry(true)
        return
      }

      if (err.message?.includes('Permission denied') || err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in app settings and try again.')
      } else if (err.message?.includes('NotReadableError') || err.name === 'NotReadableError') {
        setError('Camera is in use by another app. Please close other apps or use manual entry.')
      } else if (err.message?.includes('OverconstrainedError')) {
        // Try again with any camera
        console.log('OverconstrainedError, retrying with any camera...')
        try {
          const cameras = await Html5Qrcode.getCameras()
          if (cameras && cameras.length > 0) {
            const html5QrCode = new Html5Qrcode(scannerId)
            scannerRef.current = html5QrCode
            await html5QrCode.start(
              cameras[0].id,
              { fps: 10, qrbox: { width: 250, height: 150 } },
              (decodedText) => {
                if (navigator.vibrate) navigator.vibrate(100)
                playBeep()
                stopScanner()
                onScan(decodedText)
                onClose()
              },
              () => {}
            )
            setIsScanning(true)
            setIsInitializing(false)
            return
          }
        } catch {
          setError('Camera does not support required features. Please use manual entry.')
        }
      } else {
        // For other errors, show error with option to retry or manual entry
        console.log('Camera error:', err.message)
        setError(`Camera error: ${err.message || 'Unknown error'}. Try manual entry.`)
      }
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch (err) {
        // Ignore cleanup errors
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return

    try {
      const capabilities = scannerRef.current.getRunningTrackCameraCapabilities()
      if (capabilities && capabilities.torchFeature) {
        const torch = capabilities.torchFeature()
        if (torchEnabled) {
          await torch.disable()
        } else {
          await torch.enable()
        }
        setTorchEnabled(!torchEnabled)
      }
    } catch (err) {
      console.error('Torch toggle failed:', err)
    }
  }

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 1800
      oscillator.type = 'sine'
      gainNode.gain.value = 0.3

      oscillator.start()
      setTimeout(() => {
        oscillator.stop()
        audioContext.close()
      }, 100)
    } catch {
      // Audio not supported
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualBarcode.trim()) {
      playBeep()
      onScan(manualBarcode.trim())
      // Clear input for next scan (continuous scanning mode)
      setManualBarcode('')
      // Re-focus input for next scan
      setTimeout(() => {
        manualInputRef.current?.focus()
      }, 100)
      // Don't close - allow continuous scanning
      // User can press Escape or click X to close
    }
  }

  const handleClose = () => {
    stopScanner()
    setManualEntry(false)
    setManualBarcode('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-gradient rounded-lg">
                <Barcode size={24} className="text-white" weight="duotone" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">{title}</h2>
                <p className="text-xs text-muted-foreground">
                  {manualEntry ? 'Enter barcode manually' : 'Point camera at barcode'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-accent rounded-full transition-colors"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {manualEntry ? (
              /* Manual Entry Mode - Works with USB barcode scanners */
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Barcode / Item Code
                  </label>
                  <div className="relative">
                    <input
                      ref={manualInputRef}
                      type="text"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        // USB barcode scanners typically send Enter after barcode
                        if (e.key === 'Enter' && manualBarcode.trim()) {
                          e.preventDefault()
                          handleManualSubmit(e as any)
                        }
                      }}
                      placeholder="Scan or type barcode..."
                      className="w-full px-4 py-4 border-2 border-primary/50 rounded-lg bg-background text-foreground text-lg font-mono focus:ring-2 focus:ring-primary focus:border-primary"
                      autoFocus
                      autoComplete="off"
                    />
                    <Barcode size={24} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    💡 Use USB barcode scanner or type manually. Press Enter to submit.
                  </p>
                </div>
                
                {/* Quick action buttons */}
                <div className="flex gap-3">
                  {hasCamera && (
                    <button
                      type="button"
                      onClick={() => setManualEntry(false)}
                      className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2"
                    >
                      <Camera size={20} />
                      Use Camera
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!manualBarcode.trim()}
                    className={cn(
                      "px-6 py-3 bg-brand-gradient text-white rounded-lg font-medium disabled:opacity-50 transition-all",
                      hasCamera ? "flex-1" : "w-full"
                    )}
                  >
                    Add Item
                  </button>
                </div>
                
                {/* Continuous scanning tip */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    🔄 Scanner stays open for continuous scanning. Press Escape to close.
                  </p>
                </div>
              </form>
            ) : (
              /* Camera Mode */
              <div className="space-y-4">
                {/* Scanner Container */}
                <div
                  ref={containerRef}
                  className="relative rounded-xl overflow-hidden bg-black aspect-square"
                >
                  <div id={scannerId} className="w-full h-full" />

                  {/* Loading State */}
                  {isInitializing && !error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full mx-auto mb-3"
                        />
                        <p className="text-white text-sm">Starting camera...</p>
                        <p className="text-white/60 text-xs mt-1">Please allow camera access</p>
                      </div>
                    </div>
                  )}

                  {/* Scanning Overlay */}
                  {isScanning && !error && !isInitializing && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Corner markers - positioned based on device type */}
                      {isMobileDevice ? (
                        /* Mobile: Show qrbox-aligned markers in center */
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative" style={{ width: 280, height: 150 }}>
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
                            {/* Scanning line animation */}
                            <motion.div
                              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent"
                              animate={{
                                top: ['10%', '90%', '10%']
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'linear'
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        /* Desktop: Full frame scanning */
                        <div className="absolute inset-4">
                          <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-500 rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-500 rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-500 rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-500 rounded-br-lg" />
                          {/* Scanning line animation - full width */}
                          <motion.div
                            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent"
                            animate={{
                              top: ['10%', '90%', '10%']
                            }}
                            transition={{
                              duration: 2.5,
                              repeat: Infinity,
                              ease: 'linear'
                            }}
                          />
                        </div>
                      )}
                      {/* Instruction text */}
                      <div className="absolute bottom-2 left-0 right-0 text-center">
                        <span className="bg-black/70 text-white text-xs px-3 py-1 rounded-full">
                          {isMobileDevice ? 'Align barcode within the frame' : 'Point barcode anywhere in frame'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-4">
                      <div className="text-center">
                        <Camera size={48} className="mx-auto mb-3 text-muted-foreground" />
                        <p className="text-white text-sm mb-4">{error}</p>
                        <button
                          onClick={() => setManualEntry(true)}
                          className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
                        >
                          Enter Manually
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                  {hasTorch && (
                    <button
                      onClick={toggleTorch}
                      className={cn(
                        "px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors",
                        torchEnabled
                          ? "bg-yellow-500 text-white"
                          : "border border-border text-foreground hover:bg-accent"
                      )}
                    >
                      {torchEnabled ? (
                        <Lightning size={20} weight="fill" />
                      ) : (
                        <Lightning size={20} weight="duotone" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setManualEntry(true)}
                    className="flex-1 px-4 py-3 border border-border rounded-lg text-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2"
                  >
                    <Keyboard size={20} />
                    Enter Manually
                  </button>
                </div>

                {/* Tip */}
                <p className="text-xs text-center text-muted-foreground">
                  Supported: EAN-13, EAN-8, UPC-A, UPC-E, Code128, Code39, QR Code
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default BarcodeScanner
