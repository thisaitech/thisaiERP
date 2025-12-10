import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import {
  CloudArrowUp,
  CloudArrowDown,
  ShareNetwork,
  Buildings,
  ArrowsClockwise,
  Database,
  Upload,
  Download,
  Sparkle,
  CheckCircle,
  Warning,
  Info,
  FileCsv,
  FileXls,
  Tag,
  X,
  EnvelopeSimple,
  UserCircle
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'

const Utilities = () => {
  // Language support
  const { t, language } = useLanguage()

  const [selectedUtility, setSelectedUtility] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState('2 mins ago')

  // Sync Settings State
  const [backgroundSync, setBackgroundSync] = useState(true)
  const [wifiOnly, setWifiOnly] = useState(true)
  const [lowDataMode, setLowDataMode] = useState(false)
  const [includeAttachments, setIncludeAttachments] = useState(false)

  // Team Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')

  // Backup History State
  const [backupHistory, setBackupHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('backupHistory')
    return saved ? JSON.parse(saved) : []
  })

  // Handle Invite Member
  const handleInviteMember = () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    // In production, this would send an invitation via API
    console.log('Inviting member:', { email: inviteEmail, role: inviteRole })

    toast.success(`Invitation sent to ${inviteEmail} as ${inviteRole === 'admin' ? 'Admin' : 'Editor'}`)

    // Reset form and close modal
    setInviteEmail('')
    setInviteRole('editor')
    setShowInviteModal(false)
  }

  // Handle Backup - Export all data to JSON file
  const handleBackupNow = () => {
    try {
      toast.info('Creating backup...')

      // Collect all data from localStorage
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        data: {
          invoices: localStorage.getItem('invoices'),
          parties: localStorage.getItem('parties'),
          items: localStorage.getItem('items'),
          bankingAccounts: localStorage.getItem('bankingAccounts'),
          bankingTransactions: localStorage.getItem('bankingTransactions'),
          companySettings: localStorage.getItem('companySettings'),
          syncSettings: localStorage.getItem('syncSettings'),
          purchases: localStorage.getItem('purchases'),
          quotations: localStorage.getItem('quotations'),
          backupHistory: localStorage.getItem('backupHistory')
        }
      }

      // Convert to JSON string
      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })

      // Calculate size
      const sizeInMB = (blob.size / (1024 * 1024)).toFixed(2)

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const filename = `thisai-crm-backup-${new Date().toISOString().split('T')[0]}.json`
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Add to backup history
      const newBackup = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        size: `${sizeInMB} MB`,
        type: 'Manual',
        status: 'success',
        filename: filename
      }

      const updatedHistory = [newBackup, ...backupHistory].slice(0, 10) // Keep last 10 backups
      setBackupHistory(updatedHistory)
      localStorage.setItem('backupHistory', JSON.stringify(updatedHistory))

      toast.success(`Backup created successfully! (${sizeInMB} MB)`)
    } catch (error) {
      console.error('Backup error:', error)
      toast.error('Failed to create backup. Please try again.')
    }
  }

  // Handle Restore - Import data from JSON file
  const handleRestoreBackup = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        toast.info('Restoring backup...')

        const reader = new FileReader()
        reader.onload = (event) => {
          try {
            const backupData = JSON.parse(event.target?.result as string)

            // Validate backup structure
            if (!backupData.version || !backupData.data) {
              toast.error('Invalid backup file format')
              return
            }

            // Confirm before restoring
            if (!window.confirm('⚠️ This will replace all current data with the backup. Continue?')) {
              toast.info('Restore cancelled')
              return
            }

            // Restore all data
            Object.entries(backupData.data).forEach(([key, value]) => {
              if (value && key !== 'backupHistory') { // Don't restore backup history
                localStorage.setItem(key, value as string)
              }
            })

            toast.success('✓ Backup restored successfully! Reloading page...')

            // Reload page to reflect changes
            setTimeout(() => {
              window.location.reload()
            }, 1500)
          } catch (error) {
            console.error('Restore error:', error)
            toast.error('Failed to restore backup. Invalid file format.')
          }
        }

        reader.readAsText(file)
      } catch (error) {
        console.error('File read error:', error)
        toast.error('Failed to read backup file')
      }
    }

    input.click()
  }

  // Handle Download Backup from history
  const handleDownloadBackup = (backup: any) => {
    toast.info(`Downloading ${backup.filename}...`)
    // In production, this would download from cloud storage
    toast.warning('Cloud storage integration required for downloading old backups')
  }

  // Handle Sync Now
  const handleSyncNow = async () => {
    // Check WiFi status if "WiFi only" is enabled
    if (wifiOnly && !navigator.onLine) {
      toast.error('No internet connection. Please connect to WiFi to sync.')
      return
    }

    if (wifiOnly && navigator.onLine) {
      // Check if connection is metered (mobile data vs WiFi)
      // Note: This API is experimental and may not work in all browsers
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
      if (connection && connection.saveData) {
        toast.warning('Mobile data detected. Sync requires WiFi connection.')
        return
      }
    }

    setIsSyncing(true)
    toast.info('Syncing data to cloud...')

    try {
      // Simulate sync process (in production, this would sync with Firebase/backend)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Get all data from localStorage
      const dataToSync: any = {
        invoices: localStorage.getItem('invoices'),
        parties: localStorage.getItem('parties'),
        items: localStorage.getItem('items'),
        bankingAccounts: localStorage.getItem('bankingAccounts'),
        bankingTransactions: localStorage.getItem('bankingTransactions'),
        settings: localStorage.getItem('companySettings'),
        timestamp: new Date().toISOString()
      }

      // Include attachments if enabled
      if (includeAttachments) {
        dataToSync.attachments = localStorage.getItem('attachments') || '[]'
        dataToSync.invoicePhotos = localStorage.getItem('invoicePhotos') || '[]'
        dataToSync.billPhotos = localStorage.getItem('billPhotos') || '[]'
        console.log('Including attachments in sync')
      }

      // In production: Upload to Firebase or your backend
      // await firebase.firestore().collection('sync').doc(userId).set(dataToSync)

      console.log('Data synced:', dataToSync)

      // Update last sync time
      const now = new Date()
      setLastSyncTime('Just now')
      localStorage.setItem('lastSyncTime', now.toISOString())

      toast.success('✓ Data synced successfully!')
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Failed to sync data. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  // Load sync settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('syncSettings')
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        setBackgroundSync(settings.backgroundSync !== undefined ? settings.backgroundSync : true)
        setWifiOnly(settings.wifiOnly !== undefined ? settings.wifiOnly : true)
        setLowDataMode(settings.lowDataMode !== undefined ? settings.lowDataMode : false)
        setIncludeAttachments(settings.includeAttachments !== undefined ? settings.includeAttachments : false)
      }

      // Load last sync time
      const savedLastSync = localStorage.getItem('lastSyncTime')
      if (savedLastSync) {
        const lastSyncDate = new Date(savedLastSync)
        const now = new Date()
        const diffMinutes = Math.floor((now.getTime() - lastSyncDate.getTime()) / 60000)

        if (diffMinutes < 1) {
          setLastSyncTime('Just now')
        } else if (diffMinutes < 60) {
          setLastSyncTime(`${diffMinutes} ${diffMinutes === 1 ? 'min' : 'mins'} ago`)
        } else if (diffMinutes < 1440) {
          const hours = Math.floor(diffMinutes / 60)
          setLastSyncTime(`${hours} ${hours === 1 ? 'hour' : 'hours'} ago`)
        } else {
          const days = Math.floor(diffMinutes / 1440)
          setLastSyncTime(`${days} ${days === 1 ? 'day' : 'days'} ago`)
        }
      }
    } catch (error) {
      console.error('Failed to load sync settings:', error)
    }
  }, [])

  // Save sync settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      backgroundSync,
      wifiOnly,
      lowDataMode,
      includeAttachments
    }
    localStorage.setItem('syncSettings', JSON.stringify(settings))
    console.log('Sync settings saved:', settings)
  }, [backgroundSync, wifiOnly, lowDataMode, includeAttachments])

  // Ultra-fast background sync interval (every 15 seconds)
  useEffect(() => {
    if (!backgroundSync) {
      console.log('Background sync is disabled')
      return
    }

    console.log('Background sync enabled - syncing every 15 seconds')

    // Set up interval for 15 seconds (15000 milliseconds) - ultra-fast instant feel
    const syncInterval = setInterval(() => {
      console.log('Background sync triggered')
      handleSyncNow()
    }, 15000) // 15 seconds - ultra-fast sync like WhatsApp

    // Clean up interval on unmount or when backgroundSync changes
    return () => {
      console.log('Clearing background sync interval')
      clearInterval(syncInterval)
    }
  }, [backgroundSync, wifiOnly, lowDataMode, includeAttachments]) // Re-run if settings change

  const utilities = [
    {
      id: 'sync',
      title: 'Sync & Share',
      description: 'Synchronize data across devices and share with team',
      icon: ArrowsClockwise,
      color: 'primary',
      features: ['Auto Sync', 'Cloud Backup', 'Team Sharing', 'Real-time Updates']
    },
    {
      id: 'bulk-update',
      title: 'Bulk Update Tax Slab',
      description: 'Update tax rates for multiple items at once',
      icon: Tag,
      color: 'accent',
      features: ['Mass Update', 'CSV Import', 'Tax Templates', 'Preview Changes']
    },
    {
      id: 'companies',
      title: 'Manage Companies',
      description: 'Add and manage multiple company profiles',
      icon: Buildings,
      color: 'success',
      features: ['Multiple Companies', 'Switch Easily', 'Separate Books', 'Consolidated Reports']
    },
    {
      id: 'backup',
      title: 'Backup & Restore',
      description: 'Secure your data with automated backups',
      icon: Database,
      color: 'warning',
      features: ['Auto Backup', 'Manual Backup', 'Cloud Storage', 'Easy Restore']
    }
  ]

  const companies = [
    { id: 1, name: 'ABC Trading Co.', gstin: '29ABCDE1234F1Z5', active: true },
    { id: 2, name: 'XYZ Exports Ltd.', gstin: '27XYZAB5678G2Y4', active: false }
  ]

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-accent to-primary/80 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="max-w-[1920px] mx-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Utilities</h1>
          <p className="text-white/80 text-sm lg:text-base">Powerful tools to manage your business efficiently</p>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 -mt-6 lg:-mt-8">
        {/* Utility Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          {utilities.map((utility, index) => (
            <motion.div
              key={utility.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedUtility(utility.id)}
              className={cn(
                "bg-card rounded-lg shadow-lg border-2 p-4 lg:p-6 cursor-pointer transition-all hover:scale-105",
                selectedUtility === utility.id ? "border-primary" : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "w-12 h-12 lg:w-16 lg:h-16 rounded-lg flex items-center justify-center mb-4",
                utility.color === 'primary' && "bg-primary/10",
                utility.color === 'accent' && "bg-accent/10",
                utility.color === 'success' && "bg-success/10",
                utility.color === 'warning' && "bg-warning/10"
              )}>
                <utility.icon
                  size={24}
                  className={cn(
                    "lg:w-8 lg:h-8",
                    utility.color === 'primary' && "text-primary",
                    utility.color === 'accent' && "text-accent",
                    utility.color === 'success' && "text-success",
                    utility.color === 'warning' && "text-warning"
                  )}
                  weight="duotone"
                />
              </div>
              <h3 className="font-bold mb-2 text-base lg:text-lg">{utility.title}</h3>
              <p className="text-sm lg:text-base text-muted-foreground mb-4">{utility.description}</p>
              <div className="flex flex-wrap gap-1">
                {utility.features.slice(0, 2).map((feature, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-muted rounded">
                    {feature}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sync & Share Section */}
        {selectedUtility === 'sync' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ArrowsClockwise size={24} weight="duotone" className="text-primary" />
              Sync & Share
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-3 mb-3">
                    <CloudArrowUp size={32} weight="duotone" className="text-primary" />
                    <div>
                      <h3 className="font-bold">Cloud Sync</h3>
                      <p className="text-sm text-muted-foreground">Last synced: {lastSyncTime}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className={cn(
                      "w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium transition-all",
                      isSyncing ? "opacity-50 cursor-not-allowed" : "hover:bg-primary/90"
                    )}
                  >
                    {isSyncing ? (
                      <span className="flex items-center justify-center gap-2">
                        <ArrowsClockwise size={20} className="animate-spin" />
                        Syncing...
                      </span>
                    ) : (
                      'Sync Now'
                    )}
                  </button>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-3">Sync Settings</h4>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-success/10 border border-success/20 rounded-lg">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-success">
                      Status: Live • Last synced {lastSyncTime}
                    </span>
                  </div>

                  {/* Instant sync info (always on) */}
                  <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-primary/5 border border-primary/10 rounded">
                    <CheckCircle size={16} weight="fill" className="text-primary" />
                    <span className="text-sm text-primary font-medium">Instant sync when app is open</span>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/70 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={backgroundSync}
                        onChange={(e) => {
                          setBackgroundSync(e.target.checked)
                          if (e.target.checked) {
                            toast.success('Background sync enabled - syncs every 15 seconds')
                          } else {
                            toast.info('Background sync disabled')
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">Background sync (every 15 seconds)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/70 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={wifiOnly}
                        onChange={(e) => {
                          setWifiOnly(e.target.checked)
                          if (e.target.checked) {
                            toast.success('WiFi-only sync enabled - saves mobile data')
                          } else {
                            toast.info('Sync on any connection enabled')
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">Sync only on WiFi</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/70 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={lowDataMode}
                        onChange={(e) => {
                          setLowDataMode(e.target.checked)
                          if (e.target.checked) {
                            toast.success('Low data mode enabled - syncs every 5 min on mobile data')
                          } else {
                            toast.info('Low data mode disabled')
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">Low data mode (sync every 5 min on mobile data)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-muted/70 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={includeAttachments}
                        onChange={(e) => {
                          setIncludeAttachments(e.target.checked)
                          if (e.target.checked) {
                            toast.success('Attachments will be synced (may use more data)')
                          } else {
                            toast.info('Attachments will not be synced')
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">Include attachments</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <div className="flex items-center gap-3 mb-3">
                    <ShareNetwork size={32} weight="duotone" className="text-accent" />
                    <div>
                      <h3 className="font-bold">Share with Team</h3>
                      <p className="text-sm text-muted-foreground">3 team members</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="w-full px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90"
                  >
                    Invite Members
                  </button>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-3">Team Members</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-background rounded">
                      <div>
                        <p className="text-sm font-medium">John Doe</p>
                        <p className="text-xs text-muted-foreground">Admin</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-success/10 text-success rounded">Active</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background rounded">
                      <div>
                        <p className="text-sm font-medium">Jane Smith</p>
                        <p className="text-xs text-muted-foreground">Editor</p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-success/10 text-success rounded">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Bulk Update Tax Section */}
        {selectedUtility === 'bulk-update' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Tag size={24} weight="duotone" className="text-accent" />
              Bulk Update Tax Slab
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                  <h3 className="font-bold mb-3">Update Options</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Category</label>
                      <select className="w-full px-3 py-2 border border-border rounded-lg">
                        <option>All Items</option>
                        <option>Electronics</option>
                        <option>Furniture</option>
                        <option>Stationery</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">New Tax Rate</label>
                      <select className="w-full px-3 py-2 border border-border rounded-lg">
                        <option>GST 0%</option>
                        <option>GST 5%</option>
                        <option>GST 12%</option>
                        <option>GST 18%</option>
                        <option>GST 28%</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90">
                        Preview Changes
                      </button>
                      <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90">
                        Apply Update
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-3">Import from CSV</h4>
                  <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-lg">
                    <FileCsv size={48} weight="duotone" className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">Drop CSV file here or click to browse</p>
                    <button className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80">
                      Choose File
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3">Preview (15 items will be updated)</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="flex items-center justify-between p-3 bg-background rounded">
                      <div>
                        <p className="text-sm font-medium">Item {item}</p>
                        <p className="text-xs text-muted-foreground">Current: GST 18%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-accent">New: GST 12%</p>
                        <CheckCircle size={16} className="text-success ml-auto" weight="fill" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Manage Companies Section */}
        {selectedUtility === 'companies' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Buildings size={24} weight="duotone" className="text-success" />
                Manage Companies
              </h2>
              <button
                onClick={() => toast.info('Add new company...')}
                className="px-4 py-2 bg-success text-white rounded-lg font-medium hover:bg-success/90"
              >
                + Add Company
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className={cn(
                    "p-6 rounded-lg border-2 transition-all",
                    company.active
                      ? "bg-success/5 border-success"
                      : "bg-muted/50 border-border"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{company.name}</h3>
                      <p className="text-sm text-muted-foreground">GSTIN: {company.gstin}</p>
                    </div>
                    {company.active && (
                      <span className="px-3 py-1 bg-success text-white rounded-full text-xs font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!company.active && (
                      <button className="flex-1 px-3 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success/90">
                        Switch to This
                      </button>
                    )}
                    <button className="flex-1 px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80">
                      Edit
                    </button>
                    <button className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-3">
                <Info size={24} weight="duotone" className="text-primary flex-shrink-0" />
                <div>
                  <h4 className="font-medium mb-1">Multiple Company Management</h4>
                  <p className="text-sm text-muted-foreground">
                    Manage separate books for different companies. Switch between companies easily and generate consolidated reports.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Backup & Restore Section */}
        {selectedUtility === 'backup' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg shadow-lg border border-border p-6 mb-6"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Database size={24} weight="duotone" className="text-warning" />
              Backup & Restore
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="p-6 bg-warning/5 rounded-lg border border-warning/20">
                <CloudArrowUp size={48} weight="duotone" className="text-warning mb-4" />
                <h3 className="font-bold text-lg mb-2">Create Backup</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a complete backup of your business data
                </p>
                <button
                  onClick={handleBackupNow}
                  className="w-full px-4 py-2 bg-warning text-white rounded-lg font-medium hover:bg-warning/90"
                >
                  <Upload size={20} weight="bold" className="inline mr-2" />
                  Backup Now
                </button>
              </div>

              <div className="p-6 bg-primary/5 rounded-lg border border-primary/20">
                <CloudArrowDown size={48} weight="duotone" className="text-primary mb-4" />
                <h3 className="font-bold text-lg mb-2">Restore Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Restore your data from a previous backup
                </p>
                <button
                  onClick={handleRestoreBackup}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                >
                  <Download size={20} weight="bold" className="inline mr-2" />
                  Restore Backup
                </button>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg mb-4">
              <h4 className="font-medium mb-3">Auto Backup Settings</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Enable automatic daily backups</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">Store backups in cloud</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">Email backup notifications</span>
                </label>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Backup History</h4>
              {backupHistory.length === 0 ? (
                <div className="p-6 text-center bg-muted/30 rounded-lg border-2 border-dashed border-border">
                  <Database size={48} weight="duotone" className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No backups created yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "Backup Now" to create your first backup</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {backupHistory.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Database size={20} weight="duotone" className="text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{backup.date}</p>
                          <p className="text-xs text-muted-foreground">{backup.size} • {backup.type} Backup</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="text-success" weight="fill" />
                        <button
                          onClick={() => handleDownloadBackup(backup)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                          title="Download backup"
                        >
                          <Download size={18} weight="duotone" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg shadow-xl border border-border max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserCircle size={24} weight="duotone" className="text-accent" />
                Invite Team Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <EnvelopeSimple size={16} className="inline mr-1" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleInviteMember()
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="editor">Editor - Can view and edit</option>
                  <option value="admin">Admin - Full access</option>
                  <option value="viewer">Viewer - View only</option>
                </select>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <Info size={16} weight="duotone" className="inline text-primary mr-1" />
                  An invitation email will be sent to this address with instructions to join your team.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteMember}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Utilities
