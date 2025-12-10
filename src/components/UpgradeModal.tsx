import { motion, AnimatePresence } from 'framer-motion'
import { X, Crown, Check, Sparkle } from '@phosphor-icons/react'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  featureName: string
  featureDescription?: string
}

export const UpgradeModal = ({
  isOpen,
  onClose,
  featureName,
  featureDescription
}: UpgradeModalProps) => {
  const goldFeatures = [
    'Online Store Management',
    'Delivery Challan',
    'Purchase Orders',
    'E-Way Biller',
    'Staff Attendance Tracking',
    'Salary Management',
    'Performance Invoice',
    'Multiple Locations Support',
    'Priority Support'
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-amber-500/20 overflow-hidden pointer-events-auto my-4 max-h-[90vh] overflow-y-auto"
        >
              {/* Header with Gradient */}
              <div className="relative bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 p-8 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl"
                />

                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X size={20} className="text-white" />
                </button>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="relative inline-block mb-4"
                >
                  <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse" />
                  <Crown size={64} weight="fill" className="text-white relative z-10" />
                </motion.div>

                <h2 className="text-3xl font-bold text-white mb-2 relative z-10">
                  Upgrade to Gold Plan
                </h2>
                <p className="text-amber-100 text-lg relative z-10">
                  Unlock all premium features
                </p>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Feature Alert */}
                <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Sparkle size={24} weight="fill" className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-white font-semibold mb-1">
                        {featureName} - Premium Feature
                      </h3>
                      <p className="text-slate-300 text-sm">
                        {featureDescription || `This feature is only available in the Gold Plan. Upgrade now to unlock ${featureName} and many more premium features.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gold Features List */}
                <div className="mb-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Crown size={20} weight="fill" className="text-amber-400" />
                    What's included in Gold Plan:
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {goldFeatures.map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 text-slate-300"
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center flex-shrink-0">
                          <Check size={12} weight="bold" className="text-white" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-6 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-white font-medium transition-all"
                  >
                    Maybe Later
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement upgrade flow
                      alert('Upgrade functionality coming soon! Contact sales for Gold plan.')
                      onClose()
                    }}
                    className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-700 hover:via-yellow-600 hover:to-amber-700 text-white font-bold transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <Crown size={20} weight="fill" />
                      Upgrade Now
                    </span>
                  </button>
                </div>

                {/* Note */}
                <p className="text-slate-400 text-xs text-center mt-4">
                  You're currently on the Silver Plan. Upgrade anytime to unlock all features.
                </p>
              </div>
        </motion.div>
      </div>
    </div>
  )
}
