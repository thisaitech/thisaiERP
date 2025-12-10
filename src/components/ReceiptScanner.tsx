import React, { useState, useRef, useEffect } from 'react'
import { Camera, Upload, X, CheckCircle, Sparkle, Warning } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { scanCompleteInvoice } from '../services/enhancedReceiptAI'
import type { ScannedInvoiceData } from '../types'

interface ReceiptScannerProps {
  isOpen: boolean
  onClose: () => void
  onScanComplete: (data: ScannedInvoiceData) => void
  type: 'sale' | 'purchase' | 'expense'
}

const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ isOpen, onClose, onScanComplete, type }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScannedInvoiceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewImage(null)
      setScanResult(null)
      setIsScanning(false)
      setError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [isOpen])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setError(null)

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Scan with enhanced AI scanner
    setIsScanning(true)

    try {
      const scannedData = await scanCompleteInvoice(file)
      setScanResult(scannedData)
      setError(null)
    } catch (err: any) {
      console.error('Scanning error:', err)
      // Show the actual error message from the service
      const errorMessage = err?.message || 'Failed to scan invoice. Please try again.'
      setError(errorMessage)
      setScanResult(null)
    } finally {
      setIsScanning(false)
    }
  }

  const handleConfirm = () => {
    if (scanResult) {
      onScanComplete(scanResult)
      handleReset()
      onClose()
    }
  }

  const handleReset = () => {
    setPreviewImage(null)
    setScanResult(null)
    setIsScanning(false)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
                <Sparkle size={20} weight="duotone" className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">AI Receipt Scanner</h2>
                <p className="text-xs text-slate-600">Scan and auto-fill {type} details</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X size={20} className="text-slate-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!previewImage ? (
              // Upload Area
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                      <Upload size={32} weight="duotone" className="text-blue-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-900">Upload Invoice/Receipt Image</p>
                      <p className="text-sm text-slate-500 mt-1">Click to browse or drag and drop</p>
                      <p className="text-xs text-slate-400 mt-1">JPG, PNG (max 10MB)</p>
                    </div>
                  </div>
                </button>

                {error && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
                    <Warning size={20} weight="duotone" className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900">Upload Error</p>
                      <p className="text-xs text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {/* Info Cards */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle size={16} weight="duotone" className="text-green-600 mb-1" />
                    <p className="text-xs font-semibold text-green-900">Complete Data</p>
                    <p className="text-[10px] text-green-700">All Fields</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <CheckCircle size={16} weight="duotone" className="text-blue-600 mb-1" />
                    <p className="text-xs font-semibold text-blue-900">GST Extract</p>
                    <p className="text-[10px] text-blue-700">Tax & GSTIN</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <CheckCircle size={16} weight="duotone" className="text-purple-600 mb-1" />
                    <p className="text-xs font-semibold text-purple-900">AI Powered</p>
                    <p className="text-[10px] text-purple-700">High Accuracy</p>
                  </div>
                </div>
              </div>
            ) : (
              // Preview & Results
              <div className="grid grid-cols-2 gap-6">
                {/* Image Preview */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">Receipt Image</h3>
                  <div className="relative rounded-lg overflow-hidden border border-slate-200">
                    <img src={previewImage} alt="Receipt" className="w-full h-auto" />
                    {isScanning && (
                      <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="p-4 rounded-full bg-white shadow-lg">
                          <Sparkle size={24} weight="duotone" className="text-blue-600 animate-pulse" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extracted Data */}
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  <h3 className="font-semibold text-slate-900 sticky top-0 bg-white pb-2">Extracted Data</h3>

                  {isScanning ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                      <p className="text-sm text-slate-600">Scanning invoice...</p>
                      <p className="text-xs text-slate-400 mt-1">Extracting all fields with AI</p>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Warning size={48} weight="duotone" className="text-red-400 mb-3" />
                      <p className="text-sm text-red-600 text-center">{error}</p>
                    </div>
                  ) : scanResult ? (
                    <div className="space-y-3">
                      {/* Vendor Details */}
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-2">Vendor/Supplier</p>
                        <p className="font-semibold text-slate-900">{scanResult.vendor.name}</p>
                        {scanResult.vendor.gstin && (
                          <p className="text-xs text-slate-600 mt-1">GSTIN: {scanResult.vendor.gstin}</p>
                        )}
                        {scanResult.vendor.address && (
                          <p className="text-xs text-slate-600 mt-1">{scanResult.vendor.address}</p>
                        )}
                      </div>

                      {/* Buyer Details (if available) */}
                      {scanResult.buyer && scanResult.buyer.name && (
                        <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                          <p className="text-xs font-semibold text-green-900 mb-2">Buyer</p>
                          <p className="font-semibold text-slate-900">{scanResult.buyer.name}</p>
                          {scanResult.buyer.gstin && (
                            <p className="text-xs text-slate-600 mt-1">GSTIN: {scanResult.buyer.gstin}</p>
                          )}
                        </div>
                      )}

                      {/* Invoice Details */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">Invoice No</p>
                          <p className="font-semibold text-slate-900">{scanResult.invoiceNumber || 'N/A'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">Date</p>
                          <p className="font-semibold text-slate-900">{scanResult.invoiceDate}</p>
                        </div>
                      </div>

                      {/* Transport Details */}
                      {scanResult.vehicleNumber && (
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <p className="text-xs text-amber-900 mb-1">Vehicle Number</p>
                          <p className="font-semibold text-slate-900">{scanResult.vehicleNumber}</p>
                        </div>
                      )}

                      {/* Items */}
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-xs text-slate-500 mb-2">Items ({scanResult.items.length})</p>
                        <div className="space-y-2">
                          {scanResult.items.map((item, idx) => (
                            <div key={idx} className="text-sm border-b border-slate-200 pb-2 last:border-0">
                              <div className="flex justify-between font-semibold">
                                <span className="text-slate-900">{item.description}</span>
                                <span className="text-slate-900">₹{item.amount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-xs text-slate-600 mt-1">
                                <span>HSN: {item.hsnCode || 'N/A'}</span>
                                <span>{item.quantity} {item.unit} × ₹{item.rate}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tax Summary */}
                      <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                        <p className="text-xs font-semibold text-purple-900 mb-2">Tax Breakdown</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-700">Taxable Value</span>
                            <span className="font-semibold">₹{scanResult.taxableValue.toLocaleString()}</span>
                          </div>
                          {scanResult.cgstAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-700">CGST ({scanResult.cgstRate}%)</span>
                              <span className="font-semibold">₹{scanResult.cgstAmount.toLocaleString()}</span>
                            </div>
                          )}
                          {scanResult.sgstAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-700">SGST ({scanResult.sgstRate}%)</span>
                              <span className="font-semibold">₹{scanResult.sgstAmount.toLocaleString()}</span>
                            </div>
                          )}
                          {scanResult.igstAmount && scanResult.igstAmount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-700">IGST ({scanResult.igstRate}%)</span>
                              <span className="font-semibold">₹{scanResult.igstAmount.toLocaleString()}</span>
                            </div>
                          )}
                          {scanResult.roundOff !== 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-600">Round Off</span>
                              <span>{scanResult.roundOff > 0 ? '+' : ''}₹{scanResult.roundOff.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t border-purple-200">
                            <span className="font-bold text-purple-900">Grand Total</span>
                            <span className="font-bold text-purple-900">₹{scanResult.grandTotal.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {previewImage && !isScanning && scanResult && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
              >
                Scan Another
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md"
              >
                Confirm & Add
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default ReceiptScanner
