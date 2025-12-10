// OfflineIndicator.tsx - Shows offline/online status and sync progress
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  WifiHigh,
  WifiSlash,
  ArrowsClockwise,
  CloudArrowUp,
  CheckCircle,
  Warning,
  CloudCheck,
  CloudSlash
} from '@phosphor-icons/react'
import { subscribeSyncStatus, SyncStatus, forceSyncNow } from '../services/syncService'
import { cn } from '../lib/utils'
import { useLanguage } from '../contexts/LanguageContext'

interface OfflineIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  showDetails?: boolean
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = 'top-right',
  showDetails = true
}) => {
  const { t } = useLanguage()
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    error: null
  })
  const [expanded, setExpanded] = useState(false)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((newStatus) => {
      setStatus(newStatus)
      
      // Show banner when going offline
      if (!newStatus.isOnline && status.isOnline) {
        setShowOfflineBanner(true)
        // Auto-hide after 5 seconds
        setTimeout(() => setShowOfflineBanner(false), 5000)
      }
    })

    return () => unsubscribe()
  }, [status.isOnline])

  const positionClasses = {
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4',
    'bottom-right': 'bottom-20 right-4 md:bottom-4',
    'bottom-left': 'bottom-20 left-4 md:bottom-4'
  }

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return t.posPage.never
    const diff = Date.now() - timestamp
    if (diff < 60000) return t.posPage.justNow
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <>
      {/* Offline Banner - Full width notification */}
      <AnimatePresence>
        {showOfflineBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white py-2 px-4 flex items-center justify-center gap-2 shadow-lg"
          >
            <WifiSlash size={20} weight="bold" />
            <span className="font-medium">{t.posPage.youreOffline}</span>
            <button
              onClick={() => setShowOfflineBanner(false)}
              className="ml-4 px-2 py-0.5 bg-white/20 rounded text-sm hover:bg-white/30"
            >
              {t.posPage.dismiss}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Indicator - Hidden on mobile (shown inline in action bars instead) */}
      <div className={cn("fixed z-50 hidden md:block", positionClasses[position])}>
        <motion.div
          className="relative"
          onHoverStart={() => showDetails && setExpanded(true)}
          onHoverEnd={() => setExpanded(false)}
        >
          {/* Main Indicator Button - Only show when offline, syncing, or has pending changes */}
          {/* Following billing app best practices: no "online" indicator, only show actionable states */}
          {(!status.isOnline || status.isSyncing || status.pendingCount > 0) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (status.isOnline && status.pendingCount > 0) {
                  forceSyncNow()
                }
                setExpanded(!expanded)
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all",
                !status.isOnline
                  ? "bg-red-500 text-white"
                  : status.isSyncing
                    ? "bg-blue-500 text-white"
                    : "bg-amber-500 text-white"
              )}
            >
              {status.isSyncing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <ArrowsClockwise size={18} weight="bold" />
                </motion.div>
              ) : !status.isOnline ? (
                <CloudSlash size={18} weight="bold" />
              ) : (
                <CloudArrowUp size={18} weight="bold" />
              )}

              <span className="text-xs font-semibold">
                {status.isSyncing
                  ? t.posPage.syncing
                  : !status.isOnline
                    ? t.posPage.offline
                    : `${status.pendingCount} ${t.posPage.pending}`}
              </span>
            </motion.button>
          )}

          {/* Expanded Details Panel - Only show when indicator is visible */}
          <AnimatePresence>
            {expanded && showDetails && (!status.isOnline || status.isSyncing || status.pendingCount > 0) && (
              <motion.div
                initial={{ opacity: 0, y: position.includes('bottom') ? 10 : -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: position.includes('bottom') ? 10 : -10, scale: 0.95 }}
                className={cn(
                  "absolute bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-4 w-64",
                  position.includes('bottom') ? 'bottom-full mb-2' : 'top-full mt-2',
                  position.includes('right') ? 'right-0' : 'left-0'
                )}
              >
                {/* Connection Status */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                  {status.isOnline ? (
                    <>
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <WifiHigh size={24} className="text-green-600" weight="duotone" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-600">{t.posPage.connected}</p>
                        <p className="text-xs text-slate-500">{t.posPage.allFeaturesAvailable}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <WifiSlash size={24} className="text-red-600" weight="duotone" />
                      </div>
                      <div>
                        <p className="font-semibold text-red-600">{t.posPage.offline}</p>
                        <p className="text-xs text-slate-500">{t.posPage.workingLocally}</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Sync Status */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{t.posPage.pendingChanges}</span>
                    <span className={cn(
                      "text-sm font-bold",
                      status.pendingCount > 0 ? "text-amber-600" : "text-green-600"
                    )}>
                      {status.pendingCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{t.posPage.lastSynced}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {formatLastSync(status.lastSyncTime)}
                    </span>
                  </div>

                  {status.error && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <Warning size={16} className="text-red-500" />
                      <span className="text-xs text-red-600">{status.error}</span>
                    </div>
                  )}

                  {/* Sync Button */}
                  {status.isOnline && status.pendingCount > 0 && (
                    <button
                      onClick={() => forceSyncNow()}
                      disabled={status.isSyncing}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                        status.isSyncing
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-primary text-white hover:bg-primary/90"
                      )}
                    >
                      {status.isSyncing ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <ArrowsClockwise size={16} />
                          </motion.div>
                          {t.posPage.syncing}
                        </>
                      ) : (
                        <>
                          <CloudArrowUp size={16} />
                          {t.posPage.syncNow}
                        </>
                      )}
                    </button>
                  )}

                  {/* All Synced */}
                  {status.isOnline && status.pendingCount === 0 && !status.isSyncing && (
                    <div className="flex items-center justify-center gap-2 py-2 text-green-600">
                      <CheckCircle size={16} weight="fill" />
                      <span className="text-sm font-medium">{t.posPage.allChangesSynced}</span>
                    </div>
                  )}
                </div>

                {/* Offline Mode Info */}
                {!status.isOnline && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      <strong>{t.posPage.offlineModeActive}</strong><br/>
                      {t.posPage.offlineModeInfo}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  )
}

export default OfflineIndicator









