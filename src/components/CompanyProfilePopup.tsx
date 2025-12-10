import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Buildings,
  Lightning,
  CheckCircle,
  ArrowRight,
  X,
  Receipt,
  FileText,
  CloudArrowUp,
  Sparkle
} from '@phosphor-icons/react'
import { getCompanySettings } from '../services/settingsService'

interface CompanyProfilePopupProps {
  onDismiss?: () => void
}

const CompanyProfilePopup: React.FC<CompanyProfilePopupProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if company profile is complete
    const checkProfile = () => {
      const settings = getCompanySettings()
      const hasSeenPopup = localStorage.getItem('company_profile_popup_dismissed')

      // Required fields for a complete profile
      const isComplete =
        settings.companyName &&
        settings.companyName !== 'Your Company Name' &&
        settings.gstin &&
        settings.pan &&
        settings.state &&
        settings.phone &&
        settings.email

      // Show popup if profile is incomplete and user hasn't dismissed it today
      if (!isComplete && !hasSeenPopup) {
        // Delay popup to let the page load first
        setTimeout(() => setIsVisible(true), 1500)
      }
    }

    checkProfile()
  }, [])

  const handleDismiss = () => {
    // Store dismissal with today's date (will show again tomorrow)
    const today = new Date().toDateString()
    localStorage.setItem('company_profile_popup_dismissed', today)
    setIsVisible(false)
    onDismiss?.()
  }

  const handleComplete = () => {
    setIsVisible(false)
    navigate('/company-info')
  }

  // Clear old dismissals (show popup again next day)
  useEffect(() => {
    const dismissed = localStorage.getItem('company_profile_popup_dismissed')
    if (dismissed) {
      const today = new Date().toDateString()
      if (dismissed !== today) {
        localStorage.removeItem('company_profile_popup_dismissed')
      }
    }
  }, [])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 text-white overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>

            {/* Icon */}
            <div className="relative">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4"
              >
                <Buildings size={32} weight="duotone" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-2">
                Complete Your Company Profile
              </h2>
              <p className="text-white/80 text-sm">
                Unlock all GST & compliance features in just 60 seconds!
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Features Preview */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                Complete your profile to unlock:
              </p>
              <div className="space-y-2">
                {[
                  { icon: <Receipt size={18} />, text: 'GST Invoice Auto-Generation', color: 'emerald' },
                  { icon: <FileText size={18} />, text: 'GSTR-1 Auto-Fill (90-100%)', color: 'blue' },
                  { icon: <CloudArrowUp size={18} />, text: 'E-Invoice & E-Way Bill', color: 'violet' },
                  { icon: <Sparkle size={18} />, text: '+ 9 more powerful features', color: 'amber' }
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className={`p-1.5 rounded-lg bg-${feature.color}-100 dark:bg-${feature.color}-900/30 text-${feature.color}-600 dark:text-${feature.color}-400`}>
                      {feature.icon}
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{feature.text}</span>
                    <CheckCircle size={16} weight="fill" className="text-emerald-500 ml-auto" />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-6">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Without company info:</strong> Your invoices will show "DUMMY TRADERS" and GSTR-1 will require 100% manual entry.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                Remind Me Later
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleComplete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
              >
                <Lightning size={18} weight="fill" />
                Complete Now
                <ArrowRight size={16} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CompanyProfilePopup
