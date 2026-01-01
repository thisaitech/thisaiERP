// SyncStatusIndicator.tsx - Anna 2025
// Shows sync status with visual indicators and manual sync button

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CloudCheck,
  CloudSlash,
  CloudArrowUp,
  CloudArrowDown,
  Warning,
  ArrowsClockwise,
  WifiHigh,
  WifiSlash,
  CheckCircle,
  Clock
} from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import { getOfflineSyncSettings, saveOfflineSyncSettings, type OfflineSyncSettings } from '../services/settingsService'

interface SyncStatusIndicatorProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  onSyncNow?: () => Promise<void>
}

const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  className,
  showLabel = true,
  size = 'md',
  onSyncNow
}) => {
  const [settings, setSettings] = useState<OfflineSyncSettings>(getOfflineSyncSettings())
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      saveOfflineSyncSettings({ syncStatus: 'idle' })
    }
    const handleOffline = () => {
      setIsOnline(false)
      saveOfflineSyncSettings({ syncStatus: 'offline' })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = (e: CustomEvent<OfflineSyncSettings>) => {
      setSettings(e.detail)
    }

    window.addEventListener('offline-settings-changed', handleSettingsChange as EventListener)

    // Refresh settings periodically
    const interval = setInterval(() => {
      setSettings(getOfflineSyncSettings())
    }, 5000)

    return () => {
      window.removeEventListener('offline-settings-changed', handleSettingsChange as EventListener)
      clearInterval(interval)
    }
  }, [])

  const handleSyncNow = async () => {
    if (isSyncing || !isOnline) return

    setIsSyncing(true)
    saveOfflineSyncSettings({ syncStatus: 'syncing' })

    try {
      if (onSyncNow) {
        await onSyncNow()
      } else {
        // Simulate sync
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      saveOfflineSyncSettings({
        syncStatus: 'success',
        lastSyncTime: new Date().toISOString(),
        pendingSyncCount: 0
      })
    } catch (error) {
      saveOfflineSyncSettings({
        syncStatus: 'error',
        lastSyncError: error instanceof Error ? error.message : 'Sync failed'
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const getStatusIcon = () => {
    const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24

    if (!isOnline) {
      return <WifiSlash size={iconSize} weight="duotone" className="text-red-500" />
    }

    switch (settings.syncStatus) {
      case 'syncing':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <ArrowsClockwise size={iconSize} weight="bold" className="text-blue-500" />
          </motion.div>
        )
      case 'success':
        return <CloudCheck size={iconSize} weight="duotone" className="text-green-500" />
      case 'error':
        return <Warning size={iconSize} weight="duotone" className="text-red-500" />
      case 'offline':
        return <CloudSlash size={iconSize} weight="duotone" className="text-orange-500" />
      default:
        if (settings.pendingSyncCount > 0) {
          return <CloudArrowUp size={iconSize} weight="duotone" className="text-yellow-500" />
        }
        return <CloudCheck size={iconSize} weight="duotone" className="text-green-500" />
    }
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'

    switch (settings.syncStatus) {
      case 'syncing':
        return 'Syncing...'
      case 'success':
        return 'Synced'
      case 'error':
        return 'Sync Error'
      case 'offline':
        return 'Offline Mode'
      default:
        if (settings.pendingSyncCount > 0) {
          return `${settings.pendingSyncCount} pending`
        }
        return 'Synced'
    }
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-100 text-red-700 border-red-200'

    switch (settings.syncStatus) {
      case 'syncing':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'success':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'error':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'offline':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        if (settings.pendingSyncCount > 0) {
          return 'bg-yellow-100 text-yellow-700 border-yellow-200'
        }
        return 'bg-green-100 text-green-700 border-green-200'
    }
  }

  const formatLastSync = () => {
    if (!settings.lastSyncTime) return 'Never synced'

    const lastSync = new Date(settings.lastSyncTime)
    const now = new Date()
    const diffMs = now.getTime() - lastSync.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return lastSync.toLocaleDateString()
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all',
          getStatusColor(),
          size === 'sm' && 'text-xs px-1.5 py-0.5',
          size === 'lg' && 'text-base px-3 py-1.5'
        )}
      >
        {getStatusIcon()}
        {showLabel && (
          <span className={cn('font-medium', size === 'sm' && 'text-[10px]')}>
            {getStatusText()}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 bg-muted/50 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isOnline ? (
                      <WifiHigh size={18} className="text-green-500" weight="duotone" />
                    ) : (
                      <WifiSlash size={18} className="text-red-500" weight="duotone" />
                    )}
                    <span className="font-semibold text-sm">
                      {isOnline ? 'Connected' : 'No Internet'}
                    </span>
                  </div>
                  {settings.offlineFirstMode && (
                    <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                      Offline First
                    </span>
                  )}
                </div>
              </div>

              {/* Status Details */}
              <div className="p-4 space-y-3">
                {/* Last Sync */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock size={14} />
                    Last synced
                  </span>
                  <span className="font-medium">{formatLastSync()}</span>
                </div>

                {/* Pending Items */}
                {settings.pendingSyncCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CloudArrowUp size={14} />
                      Pending sync
                    </span>
                    <span className="font-medium text-yellow-600">
                      {settings.pendingSyncCount} items
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {settings.syncStatus === 'error' && settings.lastSyncError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-600">{settings.lastSyncError}</p>
                  </div>
                )}

                {/* Sync Now Button */}
                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing || !isOnline}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all',
                    isOnline
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {isSyncing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <ArrowsClockwise size={18} weight="bold" />
                      </motion.div>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <ArrowsClockwise size={18} weight="bold" />
                      Sync Now
                    </>
                  )}
                </button>

                {/* Quick Settings */}
                <div className="pt-2 border-t border-border space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-muted-foreground">Work Offline First</span>
                    <input
                      type="checkbox"
                      checked={settings.offlineFirstMode}
                      onChange={(e) => {
                        saveOfflineSyncSettings({ offlineFirstMode: e.target.checked })
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-xs text-muted-foreground">Auto Sync</span>
                    <input
                      type="checkbox"
                      checked={settings.autoSync}
                      onChange={(e) => {
                        saveOfflineSyncSettings({ autoSync: e.target.checked })
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </label>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SyncStatusIndicator
