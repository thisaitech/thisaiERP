// SubscriptionBanner - Shows subscription status and expiry warnings
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Crown,
  Lightning,
  Warning,
  Clock,
  X,
  ArrowRight,
  ShieldCheck,
  Sparkle
} from '@phosphor-icons/react'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/utils'

interface SubscriptionBannerProps {
  variant?: 'full' | 'compact' | 'notification'
  onUpgrade?: () => void
  className?: string
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({
  variant = 'compact',
  onUpgrade,
  className
}) => {
  const navigate = useNavigate()
  const { subscriptionState, subscription } = useAuth()

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade()
    } else {
      navigate('/settings?tab=subscription')
    }
  }

  // Don't show if active subscription with plenty of time
  if (subscriptionState.isActive && subscriptionState.daysRemaining > 5) {
    return null
  }

  // Compact badge for profile/header
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all",
          subscriptionState.isTrialing && subscriptionState.daysRemaining > 3
            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
            : subscriptionState.isTrialing && subscriptionState.daysRemaining <= 3
            ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
            : subscriptionState.isGracePeriod
            ? "bg-red-100 text-red-700 hover:bg-red-200"
            : subscriptionState.isExpired
            ? "bg-red-100 text-red-700 hover:bg-red-200 animate-pulse"
            : "bg-green-100 text-green-700",
          className
        )}
        onClick={handleUpgrade}
      >
        {subscriptionState.isTrialing && (
          <>
            <Clock size={16} weight="fill" />
            <span>Trial: {subscriptionState.daysRemaining} days left</span>
          </>
        )}
        {subscriptionState.isGracePeriod && (
          <>
            <Warning size={16} weight="fill" />
            <span>Grace period: Pay now</span>
          </>
        )}
        {subscriptionState.isExpired && (
          <>
            <Warning size={16} weight="fill" />
            <span>Expired - Upgrade</span>
          </>
        )}
        {subscriptionState.isActive && subscriptionState.daysRemaining <= 5 && (
          <>
            <Clock size={16} weight="fill" />
            <span>{subscriptionState.daysRemaining} days left</span>
          </>
        )}
      </motion.div>
    )
  }

  // Full banner for dashboard/profile
  if (variant === 'full') {
    const isUrgent = subscriptionState.daysRemaining <= 3 || subscriptionState.isExpired || subscriptionState.isGracePeriod

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-xl p-4 md:p-5 border",
          isUrgent
            ? "bg-gradient-to-r from-red-50 to-orange-50 border-red-200"
            : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
          className
        )}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className={cn(
            "p-3 rounded-xl",
            isUrgent ? "bg-red-100" : "bg-blue-100"
          )}>
            {subscriptionState.isExpired ? (
              <Warning size={28} weight="duotone" className="text-red-600" />
            ) : subscriptionState.isTrialing ? (
              <Clock size={28} weight="duotone" className={isUrgent ? "text-red-600" : "text-blue-600"} />
            ) : (
              <Crown size={28} weight="duotone" className="text-blue-600" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                "font-semibold",
                isUrgent ? "text-red-800" : "text-blue-800"
              )}>
                {subscriptionState.isExpired
                  ? "Subscription Expired"
                  : subscriptionState.isGracePeriod
                  ? "Grace Period - Action Required"
                  : subscriptionState.isTrialing
                  ? `Free Trial: ${subscriptionState.daysRemaining} days remaining`
                  : `Subscription: ${subscriptionState.daysRemaining} days remaining`
                }
              </h3>
              {subscriptionState.isTrialing && (
                <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-medium rounded-full">
                  Trial
                </span>
              )}
            </div>
            <p className={cn(
              "text-sm",
              isUrgent ? "text-red-700" : "text-blue-700"
            )}>
              {subscriptionState.isExpired
                ? "Your access is now view-only. Upgrade to continue creating and editing."
                : subscriptionState.isGracePeriod
                ? "Your trial/subscription has ended. Pay within 3 days to avoid losing edit access."
                : subscriptionState.daysRemaining <= 3
                ? "Your trial is ending soon! Upgrade now to avoid interruption."
                : "Upgrade to Pro for unlimited features and priority support."
              }
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUpgrade}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all whitespace-nowrap",
              isUrgent
                ? "bg-gradient-to-r from-red-500 to-orange-500 text-white"
                : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
            )}
          >
            <Lightning size={18} weight="fill" />
            {subscriptionState.isExpired ? "Activate Now" : "Upgrade to Pro"}
          </motion.button>
        </div>
      </motion.div>
    )
  }

  return null
}

// Login notification modal
interface SubscriptionNotificationProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
}

export const SubscriptionNotification: React.FC<SubscriptionNotificationProps> = ({
  isOpen,
  onClose,
  onUpgrade
}) => {
  const { subscriptionState } = useAuth()

  if (!isOpen) return null

  const isUrgent = subscriptionState.daysRemaining <= 3 || subscriptionState.isExpired

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header with gradient */}
            <div className={cn(
              "p-6 text-white relative overflow-hidden",
              isUrgent
                ? "bg-gradient-to-br from-red-500 to-orange-500"
                : "bg-gradient-to-br from-blue-500 to-indigo-600"
            )}>
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X size={18} />
              </button>

              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />

              <div className="relative flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  {subscriptionState.isExpired ? (
                    <Warning size={32} weight="duotone" />
                  ) : (
                    <Clock size={32} weight="duotone" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {subscriptionState.isExpired
                      ? "Subscription Expired"
                      : `${subscriptionState.daysRemaining} Days Remaining`
                    }
                  </h2>
                  <p className="text-white/80 text-sm">
                    {subscriptionState.isTrialing ? "Free Trial" : "Subscription"}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                {subscriptionState.isExpired
                  ? "Your subscription has expired. You can view your data but cannot create or edit anything. Upgrade now to restore full access."
                  : subscriptionState.daysRemaining <= 3
                  ? "Your trial is ending very soon! Don't lose access to your data. Upgrade now to continue using all features."
                  : "Your free trial is ending soon. Upgrade to Pro to continue enjoying unlimited invoices, reports, and more."
                }
              </p>

              {/* Pricing */}
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-slate-600">Monthly</span>
                  <span className="font-bold text-lg">₹499<span className="text-slate-400 text-sm font-normal">/month</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Yearly</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      Save ₹989
                    </span>
                  </div>
                  <span className="font-bold text-lg">₹4,999<span className="text-slate-400 text-sm font-normal">/year</span></span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6">
                {[
                  "Unlimited invoices & quotations",
                  "Advanced reports & analytics",
                  "WhatsApp integration",
                  "Priority support"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <ShieldCheck size={16} className="text-green-500" weight="fill" />
                    {feature}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Remind Later
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onUpgrade}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white shadow-lg transition-all",
                    isUrgent
                      ? "bg-gradient-to-r from-red-500 to-orange-500"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500"
                  )}
                >
                  <Sparkle size={18} weight="fill" />
                  Upgrade Now
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// View-only mode banner (shown when subscription expired)
export const ViewOnlyBanner: React.FC<{ className?: string }> = ({ className }) => {
  const navigate = useNavigate()
  const { subscriptionState } = useAuth()

  if (!subscriptionState.isExpired) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm",
        className
      )}
    >
      <Warning size={18} weight="fill" />
      <span className="font-medium">View-only mode - Your subscription has expired</span>
      <button
        onClick={() => navigate('/settings?tab=subscription')}
        className="flex items-center gap-1 px-3 py-1 bg-white text-red-600 rounded-full font-semibold text-xs hover:bg-red-50 transition-colors"
      >
        Upgrade <ArrowRight size={12} weight="bold" />
      </button>
    </motion.div>
  )
}

export default SubscriptionBanner
