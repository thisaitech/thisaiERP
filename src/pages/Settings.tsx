import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import {
  Gear,
  User,
  Receipt,
  Printer,
  Percent,
  Bell,
  ChatCircle,
  Users,
  Package,
  Globe,
  Lock,
  Palette,
  Moon,
  Sun,
  Building,
  Phone,
  Envelope,
  MapPin,
  Database,
  Trash,
  Table,
  CloudArrowUp,
  CloudArrowDown,
  WifiHigh,
  ArrowsClockwise,
  HardDrive,
  CreditCard,
  Link,
  CheckCircle,
  XCircle,
  Eye,
  EyeSlash,
  Plus,
  UserCircle,
  ShieldCheck,
  Warning,
  PencilSimple,
  Toolbox,
  Tag,
  ShareNetwork,
  X
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { generateAllDummyData, clearAllDummyData } from '../services/dummyDataService'
import {
  exportCompleteData,
  exportInvoicesOnly,
  exportPartiesOnly,
  exportItemsOnly,
  createBackupJSON
} from '../services/dataExportService'
import { clearAllData } from '../utils/clearAllData'
import {
  getGeneralSettings,
  saveGeneralSettings,
  GeneralSettings,
  getCompanySettings,
  saveCompanySettings,
  CompanySettings,
  getTransactionSettings,
  saveTransactionSettings,
  TransactionSettings,
  getInvoicePrintSettings,
  saveInvoicePrintSettings,
  InvoicePrintSettings,
  getTaxSettings,
  saveTaxSettings,
  TaxSettings,
  getSMSSettings,
  saveSMSSettings,
  SMSSettings,
  getReminderSettings,
  saveReminderSettings,
  ReminderSettings,
  getPartySettings,
  savePartySettings,
  PartySettings,
  getItemSettings,
  saveItemSettings,
  ItemSettings,
  getInvoiceTableColumnSettings,
  saveInvoiceTableColumnSettings,
  InvoiceTableColumnSettings,
  getOfflineSyncSettings,
  saveOfflineSyncSettings,
  OfflineSyncSettings
} from '../services/settingsService'
import { INDIAN_STATES_WITH_CODES, getStateCode } from '../services/taxCalculations'
import {
  getCacheStats,
  clearAllOfflineData,
  cacheItems,
  cacheParties,
  cacheInvoices,
  isDeviceOnline
} from '../services/offlineSyncService'
import { getItems } from '../services/itemService'
import { getParties } from '../services/partyService'
import { getInvoices } from '../services/invoiceService'
import {
  getRazorpayConfig,
  saveRazorpayConfig,
  validateRazorpayKeys,
  isRazorpayConfigured,
  RazorpayConfig
} from '../services/razorpayService'
import {
  createStaffUser,
  getCompanyUsers,
  updateUserRole,
  updateUserStatus,
  deleteStaffUser,
  signIn,
  reauthenticate,
  type UserData,
  type UserRole
} from '../services/authService'
import {
  PagePermissions,
  PAGE_INFO,
  DEFAULT_ROLE_PERMISSIONS,
  getAllUserPermissionsSync,
  getUserPermissionsSync,
  saveUserPermissions,
  deleteUserPermissions
} from '../services/permissionsService'

const Settings = () => {
  const { t } = useLanguage()
  const { isDarkMode, setDarkMode } = useTheme()
  const [selectedSection, setSelectedSection] = useState('general')
  const [isGenerating, setIsGenerating] = useState(false)

  // Settings State
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(getGeneralSettings())
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getCompanySettings())
  const [transactionSettings, setTransactionSettings] = useState<TransactionSettings>(getTransactionSettings())
  const [invoicePrintSettings, setInvoicePrintSettings] = useState<InvoicePrintSettings>(getInvoicePrintSettings())
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(getTaxSettings())
  const [smsSettings, setSmsSettings] = useState<SMSSettings>(getSMSSettings())
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(getReminderSettings())
  const [partySettings, setPartySettings] = useState<PartySettings>(getPartySettings())
  const [itemSettings, setItemSettings] = useState<ItemSettings>(getItemSettings())
  const [showAddUnitModal, setShowAddUnitModal] = useState(false)
  const [showDeleteUnitModal, setShowDeleteUnitModal] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')
  const [unitToDelete, setUnitToDelete] = useState<string | null>(null)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [invoiceTableColumnSettings, setInvoiceTableColumnSettings] = useState<InvoiceTableColumnSettings>(getInvoiceTableColumnSettings())
  const [offlineSyncSettings, setOfflineSyncSettings] = useState<OfflineSyncSettings>(getOfflineSyncSettings())
  const [cacheStats, setCacheStats] = useState({ items: 0, parties: 0, invoices: 0, pendingSync: 0, lastSync: null as string | null })
  const [isCaching, setIsCaching] = useState(false)
  
  // Razorpay State
  const [razorpayConfig, setRazorpayConfig] = useState<RazorpayConfig>(getRazorpayConfig())
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false)
  const [isValidatingRazorpay, setIsValidatingRazorpay] = useState(false)
  const [razorpayValidationStatus, setRazorpayValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')

  // User Management State
  const { userData } = useAuth()
  const [companyUsers, setCompanyUsers] = useState<UserData[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserRole, setNewUserRole] = useState<'manager' | 'cashier'>('cashier')
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [adminPassword, setAdminPassword] = useState('') // For re-authentication after creating user
  const [showAdminReauth, setShowAdminReauth] = useState(false)
  const [pendingNewUser, setPendingNewUser] = useState<UserData | null>(null)

  // Page Permissions State
  const [selectedPermissionUser, setSelectedPermissionUser] = useState<string>('')
  const [userPermissions, setUserPermissions] = useState<PagePermissions | null>(null)
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [showPermissionModal, setShowPermissionModal] = useState(false)

  // User Management Sub-tabs
  const [userManagementTab, setUserManagementTab] = useState<'users' | 'permissions'>('users')

  // Offline State
  const [isOffline, setIsOffline] = useState(!isDeviceOnline())

  // Check if current user is admin
  const isAdmin = userData?.role === 'admin'

  // Network status listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Update initial state
    setIsOffline(!isDeviceOnline())

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Cache users to localStorage for offline viewing
  const cacheUsersToLocalStorage = (users: UserData[]) => {
    try {
      localStorage.setItem('cached_company_users', JSON.stringify({
        data: users,
        cachedAt: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to cache users:', error)
    }
  }

  // Get cached users from localStorage
  const getCachedUsers = (): UserData[] => {
    try {
      const cached = localStorage.getItem('cached_company_users')
      if (cached) {
        const { data } = JSON.parse(cached)
        return data || []
      }
    } catch (error) {
      console.error('Failed to get cached users:', error)
    }
    return []
  }

  // Load company users - OFFLINE FIRST
  const loadCompanyUsers = async () => {
    if (!userData?.companyId || !isAdmin) return

    setIsLoadingUsers(true)

    // If offline, load from cache immediately
    if (!isDeviceOnline()) {
      const cachedUsers = getCachedUsers()
      setCompanyUsers(cachedUsers)
      setIsLoadingUsers(false)
      if (cachedUsers.length === 0) {
        toast.info('You are offline. User data is not available.')
      } else {
        toast.info('Showing cached user data (offline mode)')
      }
      return
    }

    try {
      const users = await getCompanyUsers(userData.companyId)
      setCompanyUsers(users)
      // Cache for offline use
      cacheUsersToLocalStorage(users)
    } catch (error) {
      console.error('Failed to load users:', error)
      // Try to load from cache on error
      const cachedUsers = getCachedUsers()
      if (cachedUsers.length > 0) {
        setCompanyUsers(cachedUsers)
        toast.warning('Using cached user data (connection error)')
      } else {
        toast.error('Failed to load users')
      }
    } finally {
      setIsLoadingUsers(false)
    }
  }

  // Load settings on mount
  useEffect(() => {
    setGeneralSettings(getGeneralSettings())
    setCompanySettings(getCompanySettings())
    setTransactionSettings(getTransactionSettings())
    setInvoicePrintSettings(getInvoicePrintSettings())
    setTaxSettings(getTaxSettings())
    setSmsSettings(getSMSSettings())
    setReminderSettings(getReminderSettings())
    setPartySettings(getPartySettings())
    setItemSettings(getItemSettings())
    setInvoiceTableColumnSettings(getInvoiceTableColumnSettings())
    setOfflineSyncSettings(getOfflineSyncSettings())
    loadCacheStats()
  }, [])

  // Load cache statistics
  const loadCacheStats = async () => {
    try {
      const stats = await getCacheStats()
      setCacheStats(stats)
    } catch (error) {
      console.error('Failed to load cache stats:', error)
    }
  }

  // Load users when users or pagePermissions section is selected
  useEffect(() => {
    if ((selectedSection === 'users' || selectedSection === 'pagePermissions') && isAdmin) {
      loadCompanyUsers()
    }
  }, [selectedSection, isAdmin])

  // Handle creating a new staff user
  const handleCreateUser = async () => {
    if (!userData) {
      toast.error('You must be logged in')
      return
    }

    if (!newUserEmail || !newUserPassword || !newUserName) {
      toast.error('Please fill in all fields')
      return
    }

    if (newUserPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsCreatingUser(true)
    try {
      const newUser = await createStaffUser(
        newUserEmail,
        newUserPassword,
        newUserName,
        newUserRole,
        userData
      )

      // Store the new user data for display
      setPendingNewUser(newUser)

      // Show re-authentication modal
      setShowAddUserModal(false)
      setShowAdminReauth(true)

      toast.success(`User ${newUserName} created successfully!`)

      // Clear form
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserName('')
      setNewUserRole('cashier')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user')
    } finally {
      setIsCreatingUser(false)
    }
  }

  // Handle admin re-authentication after creating user
  const handleAdminReauth = async () => {
    if (!adminPassword) {
      toast.error('Please enter your password')
      return
    }

    try {
      // Use proper Firebase re-authentication
      await reauthenticate(adminPassword)
      toast.success('Re-authenticated successfully')
      setShowAdminReauth(false)
      setAdminPassword('')
      setPendingNewUser(null)
      // Reload users to show the new user
      loadCompanyUsers()
    } catch (error: any) {
      toast.error(error.message || 'Re-authentication failed. Please check your password.')
    }
  }

  // Handle changing user role
  const handleChangeRole = async (targetUid: string, newRole: 'manager' | 'cashier') => {
    if (!userData) return

    try {
      await updateUserRole(targetUid, newRole, userData)
      toast.success('User role updated')
      loadCompanyUsers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role')
    }
  }

  // Handle changing user status
  const handleChangeStatus = async (targetUid: string, newStatus: 'active' | 'inactive') => {
    if (!userData) return

    try {
      await updateUserStatus(targetUid, newStatus, userData)
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
      loadCompanyUsers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  // Handle deleting a user
  const handleDeleteUser = async (targetUid: string, userName: string) => {
    if (!userData) return

    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return
    }

    try {
      await deleteStaffUser(targetUid, userData)
      toast.success('User deleted')
      loadCompanyUsers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user')
    }
  }

  // Get role badge color
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'cashier': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Page Permissions Handlers
  const handleSelectPermissionUser = (userId: string) => {
    setSelectedPermissionUser(userId)
    if (userId) {
      const selectedUser = companyUsers.find(u => u.uid === userId)
      if (selectedUser) {
        const permissions = getUserPermissionsSync(userId, selectedUser.role)
        setUserPermissions(permissions)
        setShowPermissionModal(true)
      }
    } else {
      setUserPermissions(null)
      setShowPermissionModal(false)
    }
  }

  const handleClosePermissionModal = () => {
    setShowPermissionModal(false)
    setSelectedPermissionUser('')
    setUserPermissions(null)
  }

  const handleTogglePagePermission = (pageKey: keyof PagePermissions) => {
    if (!userPermissions) return
    setUserPermissions({
      ...userPermissions,
      [pageKey]: !userPermissions[pageKey]
    })
  }

  const handleSavePagePermissions = async () => {
    const selectedUser = companyUsers.find(u => u.uid === selectedPermissionUser)
    if (!selectedUser || !userPermissions || !userData) return

    setIsSavingPermissions(true)
    try {
      const success = await saveUserPermissions(
        selectedUser.uid,
        selectedUser.email,
        selectedUser.role as 'admin' | 'manager' | 'cashier',
        userPermissions,
        userData.uid,
        selectedUser.displayName
      )
      if (success) {
        toast.success('Page permissions saved successfully!')
      } else {
        toast.error('Failed to save permissions')
      }
    } catch (error) {
      console.error('Error saving permissions:', error)
      toast.error('Failed to save permissions')
    } finally {
      setIsSavingPermissions(false)
    }
  }

  const handleResetToRoleDefaults = async () => {
    const selectedUser = companyUsers.find(u => u.uid === selectedPermissionUser)
    if (!selectedUser) return

    if (confirm('Reset permissions to role defaults? This will remove any custom permissions.')) {
      await deleteUserPermissions(selectedUser.uid)
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[selectedUser.role] || DEFAULT_ROLE_PERMISSIONS.cashier
      setUserPermissions(defaultPerms)
      toast.success('Permissions reset to role defaults')
    }
  }

  // Save Handlers
  const handleSaveGeneralSettings = () => {
    saveGeneralSettings(generalSettings)
    toast.success('General settings saved successfully!')
  }

  const handleSaveCompanySettings = () => {
    saveCompanySettings(companySettings)
    toast.success('Company information updated successfully!')
  }

  const handleSaveTransactionSettings = () => {
    saveTransactionSettings(transactionSettings)
    toast.success('Transaction settings saved successfully!')
  }

  const handleSaveInvoicePrintSettings = () => {
    saveInvoicePrintSettings(invoicePrintSettings)
    toast.success('Invoice print settings saved successfully!')
  }

  const handleSaveTaxSettings = () => {
    saveTaxSettings(taxSettings)
    toast.success('Tax settings saved successfully!')
  }

  const handleSaveSMSSettings = () => {
    saveSMSSettings(smsSettings)
    toast.success('SMS settings saved successfully!')
  }

  const handleSaveReminderSettings = () => {
    saveReminderSettings(reminderSettings)
    toast.success('Reminder settings saved successfully!')
  }

  const handleSavePartySettings = () => {
    savePartySettings(partySettings)
    toast.success('Party settings saved successfully!')
  }

  const handleSaveItemSettings = () => {
    saveItemSettings(itemSettings)
    toast.success('Item settings saved successfully!')
  }

  const handleSaveInvoiceTableColumnSettings = () => {
    saveInvoiceTableColumnSettings(invoiceTableColumnSettings)
    toast.success('Invoice table column settings saved successfully!')
  }

  const settingsSections = [
    { id: 'general', label: t.settings.general, icon: Gear },
    { id: 'language', label: t.settings.languageLabel, icon: Globe },
    { id: 'company', label: t.settings.companyInfo, icon: Building },
    { id: 'razorpay', label: t.settings.razorpayPayments, icon: CreditCard },
    { id: 'offlineSync', label: t.settings.offlineAndSync, icon: CloudArrowUp },
    { id: 'backup', label: t.settings.backupAndExport, icon: Database },
    { id: 'transaction', label: t.settings.transaction, icon: Receipt },
    { id: 'invoice', label: t.settings.invoicePrint, icon: Printer },
    { id: 'invoiceTable', label: t.settings.invoiceTable, icon: Table },
    { id: 'taxes', label: t.settings.taxesAndGst, icon: Percent },
    { id: 'users', label: t.settings.userManagement, icon: Users },
    { id: 'sms', label: t.settings.transactionalSms, icon: ChatCircle },
    { id: 'reminders', label: t.settings.reminders, icon: Bell },
    { id: 'party', label: t.settings.partySettings, icon: Users },
    { id: 'items', label: t.settings.itemSettings, icon: Package },
    { id: 'utilities', label: t.settings.utilities, icon: Toolbox },
    { id: 'developer', label: t.settings.developerTools, icon: Database }
  ]

  // Offline Sync Handlers
  const handleSaveOfflineSettings = () => {
    saveOfflineSyncSettings(offlineSyncSettings)
    toast.success('Offline & Sync settings saved successfully!')
  }

  const handleCacheAllData = async () => {
    setIsCaching(true)
    toast.loading('Caching data for offline use...')
    try {
      const [items, parties, invoices] = await Promise.all([
        getItems(),
        getParties(),
        getInvoices()
      ])
      await Promise.all([
        cacheItems(items),
        cacheParties(parties),
        cacheInvoices(invoices)
      ])
      await loadCacheStats()
      toast.dismiss()
      toast.success(`Cached ${items.length} items, ${parties.length} parties, ${invoices.length} invoices`)
    } catch (error) {
      console.error('Failed to cache data:', error)
      toast.dismiss()
      toast.error('Failed to cache data for offline use')
    } finally {
      setIsCaching(false)
    }
  }

  const handleClearOfflineCache = async () => {
    if (confirm('Are you sure you want to clear all offline cached data?')) {
      try {
        await clearAllOfflineData()
        await loadCacheStats()
        toast.success('Offline cache cleared successfully')
      } catch (error) {
        toast.error('Failed to clear offline cache')
      }
    }
  }

  const handleGenerateDummyData = async () => {
    setIsGenerating(true)
    toast.loading('Generating dummy data...')

    try {
      const result = await generateAllDummyData()
      toast.success(`Successfully generated ${result.total} records!\n- ${result.parties} Parties\n- ${result.items} Items\n- ${result.sales} Sales\n- ${result.purchases} Purchases\n- ${result.challans} Delivery Challans\n- ${result.purchaseOrders} Purchase Orders`)
    } catch (error) {
      console.error('Error generating dummy data:', error)
      toast.error('Failed to generate dummy data')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClearAllData = async () => {
    if (!confirm('⚠️ WARNING: This will DELETE ALL data including:\n\n• All Parties/Customers\n• All Items/Products\n• All Invoices\n• All Delivery Challans\n• All Purchase Orders\n• Local Storage data\n\nThis action CANNOT be undone!\n\nAre you absolutely sure?')) {
      return
    }

    // Double confirmation
    if (!confirm('🚨 FINAL CONFIRMATION\n\nThis is your last chance to cancel.\n\nClick OK to permanently delete all data.')) {
      return
    }

    const loadingToast = toast.loading('Clearing all data...')

    try {
      await clearAllData()
      toast.success('All data cleared successfully!', { id: loadingToast })

      // Wait a bit before reload to show the success message
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error('Error clearing data:', error)
      toast.error('Failed to clear data', { id: loadingToast })
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-accent to-primary/80 p-6 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{t.settings.title}</h1>
          <p className="text-white/80 text-sm">{t.settings.configurePreferences}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg shadow-lg border border-border p-4 sticky top-4">
              <nav className="space-y-1">
                {settingsSections.map((section, index) => (
                  <motion.button
                    key={section.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      setSelectedSection(section.id)
                      setUserSearchQuery('') // Clear search when switching sections
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                      selectedSection === section.id
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <section.icon size={20} weight={selectedSection === section.id ? "duotone" : "regular"} />
                    <span className="text-sm">{section.label}</span>
                  </motion.button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              {/* General Settings */}
              {selectedSection === 'general' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">{t.settings.generalSettings}</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t.settings.businessName}</label>
                      <input
                        type="text"
                        value={generalSettings.businessName}
                        onChange={(e) => setGeneralSettings({...generalSettings, businessName: e.target.value})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.financialYear}</label>
                        <select
                          value={generalSettings.financialYear}
                          onChange={(e) => setGeneralSettings({...generalSettings, financialYear: e.target.value})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        >
                          <option>2023-2024</option>
                          <option>2024-2025</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.currency}</label>
                        <select
                          value={generalSettings.currency}
                          onChange={(e) => setGeneralSettings({...generalSettings, currency: e.target.value as 'INR' | 'USD' | 'EUR', currencySymbol: e.target.value === 'INR' ? '₹' : e.target.value === 'USD' ? '$' : '€'})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.dateFormat}</label>
                        <select
                          value={generalSettings.dateFormat}
                          onChange={(e) => setGeneralSettings({...generalSettings, dateFormat: e.target.value as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        >
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.timeFormat}</label>
                        <select
                          value={generalSettings.timeFormat}
                          onChange={(e) => setGeneralSettings({...generalSettings, timeFormat: e.target.value as '12' | '24'})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        >
                          <option value="12">{t.settings.hour12}</option>
                          <option value="24">{t.settings.hour24}</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-medium mb-3">{t.settings.appearance}</h3>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isDarkMode ? <Moon size={20} weight="duotone" /> : <Sun size={20} weight="duotone" />}
                          <span className="text-sm">{t.settings.darkMode}</span>
                        </div>
                        <label className="relative inline-block w-12 h-6">
                          <input
                            type="checkbox"
                            checked={isDarkMode}
                            onChange={() => {
                              const newValue = !isDarkMode
                              setDarkMode(newValue)
                              setGeneralSettings({...generalSettings, darkMode: newValue})
                              // Save immediately
                              saveGeneralSettings({...generalSettings, darkMode: newValue})
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-full h-full bg-muted rounded-full peer peer-checked:bg-primary transition-colors cursor-pointer"></div>
                          <div className={cn(
                            "absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform",
                            isDarkMode && "translate-x-6"
                          )}></div>
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveGeneralSettings}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      {t.settings.saveChanges}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Language Settings */}
              {selectedSection === 'language' && (
                <LanguageSettingsSection />
              )}

              {/* Company Info */}
              {selectedSection === 'company' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">{t.settings.companyInfo}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t.settings.companyName}</label>
                      <input
                        type="text"
                        value={companySettings.companyName}
                        onChange={(e) => setCompanySettings({...companySettings, companyName: e.target.value})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.gstin}</label>
                        <input
                          type="text"
                          value={companySettings.gstin}
                          onChange={(e) => setCompanySettings({...companySettings, gstin: e.target.value})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.panNumber}</label>
                        <input
                          type="text"
                          value={companySettings.pan}
                          onChange={(e) => setCompanySettings({...companySettings, pan: e.target.value})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t.settings.address}</label>
                      <textarea
                        rows={3}
                        value={companySettings.address}
                        onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                      ></textarea>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                          <MapPin size={16} />
                          City
                        </label>
                        <input
                          type="text"
                          value={companySettings.city || ''}
                          onChange={(e) => setCompanySettings({...companySettings, city: e.target.value})}
                          placeholder="Enter city"
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                          <MapPin size={16} />
                          State <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={companySettings.state || ''}
                          onChange={(e) => {
                            const selectedState = e.target.value
                            const stateCode = getStateCode(selectedState)
                            setCompanySettings({
                              ...companySettings,
                              state: selectedState,
                              stateCode: stateCode
                            })
                          }}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES_WITH_CODES.map((state) => (
                            <option key={state.code} value={state.name}>
                              {state.name} ({state.code})
                            </option>
                          ))}
                        </select>
                        {companySettings.state && (
                          <p className="text-xs text-muted-foreground mt-1">
                            State Code: {companySettings.stateCode || getStateCode(companySettings.state)}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Pincode</label>
                        <input
                          type="text"
                          value={companySettings.pincode || ''}
                          onChange={(e) => setCompanySettings({...companySettings, pincode: e.target.value})}
                          placeholder="Enter pincode"
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                          <Phone size={16} />
                          {t.settings.phone}
                        </label>
                        <input
                          type="tel"
                          value={companySettings.phone}
                          onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                          <Envelope size={16} />
                          {t.settings.email}
                        </label>
                        <input
                          type="email"
                          value={companySettings.email}
                          onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSaveCompanySettings}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      {t.settings.updateCompanyInfo}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Razorpay Payment Gateway Settings */}
              {selectedSection === 'razorpay' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <CreditCard size={24} weight="duotone" className="text-blue-600" />
                        Razorpay Payment Gateway
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Accept payments via UPI, Cards, Net Banking, and Wallets
                      </p>
                    </div>
                    {isRazorpayConfigured() && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        <CheckCircle size={16} weight="fill" />
                        Connected
                      </div>
                    )}
                  </div>

                  {/* Getting Started Guide */}
                  {!isRazorpayConfigured() && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                      <h3 className="font-semibold text-blue-800 mb-2">🚀 Quick Setup Guide</h3>
                      <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                        <li>Sign up at <a href="https://razorpay.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">razorpay.com</a> (free, takes 5 mins)</li>
                        <li>Go to Account & Settings → API Keys</li>
                        <li>Generate Test or Live keys</li>
                        <li>Paste Key ID and Secret below</li>
                      </ol>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* API Keys Section */}
                    <div className="bg-muted/30 rounded-xl p-5 border border-border">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Lock size={18} className="text-primary" />
                        API Credentials
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Key ID */}
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Key ID <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={razorpayConfig.keyId}
                            onChange={(e) => setRazorpayConfig(prev => ({ ...prev, keyId: e.target.value }))}
                            placeholder="rzp_test_xxxxxxxxxxxxx or rzp_live_xxxxxxxxxxxxx"
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Starts with rzp_test_ (test mode) or rzp_live_ (live mode)
                          </p>
                        </div>

                        {/* Key Secret */}
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Key Secret <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showRazorpaySecret ? 'text' : 'password'}
                              value={razorpayConfig.keySecret}
                              onChange={(e) => setRazorpayConfig(prev => ({ ...prev, keySecret: e.target.value }))}
                              placeholder="Enter your Razorpay Key Secret"
                              className="w-full px-4 py-2.5 pr-12 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showRazorpaySecret ? <EyeSlash size={20} /> : <Eye size={20} />}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Keep this secret secure. Never share it publicly.
                          </p>
                        </div>

                        {/* Mode Indicator */}
                        <div className="flex items-center gap-4 pt-2">
                          <div className={cn(
                            "px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2",
                            razorpayConfig.keyId.includes('_live_') 
                              ? "bg-green-100 text-green-700" 
                              : "bg-amber-100 text-amber-700"
                          )}>
                            {razorpayConfig.keyId.includes('_live_') ? (
                              <>
                                <CheckCircle size={16} weight="fill" />
                                Live Mode
                              </>
                            ) : (
                              <>
                                <Database size={16} />
                                Test Mode
                              </>
                            )}
                          </div>
                          
                          {razorpayValidationStatus === 'valid' && (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                              <CheckCircle size={16} weight="fill" />
                              Keys validated
                            </span>
                          )}
                          {razorpayValidationStatus === 'invalid' && (
                            <span className="text-sm text-red-600 flex items-center gap-1">
                              <XCircle size={16} weight="fill" />
                              Invalid keys
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-muted/30 rounded-xl p-5 border border-border">
                      <h3 className="font-semibold mb-4">Enabled Payment Methods</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { key: 'upi', label: 'UPI', icon: '📱' },
                          { key: 'card', label: 'Card', icon: '💳' },
                          { key: 'netbanking', label: 'Net Banking', icon: '🏦' },
                          { key: 'wallet', label: 'Wallet', icon: '👛' }
                        ].map((method) => (
                          <label
                            key={method.key}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                              razorpayConfig.enabledMethods[method.key as keyof typeof razorpayConfig.enabledMethods]
                                ? "bg-primary/10 border-primary"
                                : "bg-background border-border hover:border-primary/50"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={razorpayConfig.enabledMethods[method.key as keyof typeof razorpayConfig.enabledMethods]}
                              onChange={(e) => setRazorpayConfig(prev => ({
                                ...prev,
                                enabledMethods: { ...prev.enabledMethods, [method.key]: e.target.checked }
                              }))}
                              className="sr-only"
                            />
                            <span className="text-xl">{method.icon}</span>
                            <span className="font-medium text-sm">{method.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Additional Options */}
                    <div className="bg-muted/30 rounded-xl p-5 border border-border">
                      <h3 className="font-semibold mb-4">Additional Options</h3>
                      <div className="space-y-4">
                        <label className="flex items-center justify-between cursor-pointer">
                          <div>
                            <span className="font-medium">Auto-generate Payment Links</span>
                            <p className="text-sm text-muted-foreground">
                              Automatically create payment links when saving invoices
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={razorpayConfig.autoGenerateLinks}
                            onChange={(e) => setRazorpayConfig(prev => ({ ...prev, autoGenerateLinks: e.target.checked }))}
                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                          />
                        </label>

                        {/* Webhook Secret */}
                        <div>
                          <label className="text-sm font-medium mb-1.5 block">
                            Webhook Secret (Optional)
                          </label>
                          <input
                            type="text"
                            value={razorpayConfig.webhookSecret || ''}
                            onChange={(e) => setRazorpayConfig(prev => ({ ...prev, webhookSecret: e.target.value }))}
                            placeholder="For auto-syncing payment status"
                            className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Find this in Razorpay Dashboard → Webhooks → Add Endpoint
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={async () => {
                          setIsValidatingRazorpay(true)
                          const result = await validateRazorpayKeys(razorpayConfig.keyId, razorpayConfig.keySecret)
                          setRazorpayValidationStatus(result.valid ? 'valid' : 'invalid')
                          setIsValidatingRazorpay(false)
                          
                          if (result.valid) {
                            toast.success(result.message)
                          } else {
                            toast.error(result.message)
                          }
                        }}
                        disabled={isValidatingRazorpay || !razorpayConfig.keyId || !razorpayConfig.keySecret}
                        className="px-4 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isValidatingRazorpay ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={18} />
                            Test Connection
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          if (saveRazorpayConfig(razorpayConfig)) {
                            toast.success('Razorpay settings saved successfully!')
                          } else {
                            toast.error('Failed to save settings')
                          }
                        }}
                        disabled={!razorpayConfig.keyId || !razorpayConfig.keySecret}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save Settings
                      </button>

                      <a
                        href="https://dashboard.razorpay.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 text-blue-600 hover:underline flex items-center gap-1 text-sm"
                      >
                        <Link size={16} />
                        Open Razorpay Dashboard
                      </a>
                    </div>

                    {/* Fees Info */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                      <p className="text-sm text-amber-800">
                        <strong>💡 Note:</strong> Razorpay charges ~2% + GST per transaction. No setup or monthly fees.
                        Test mode transactions are free.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Offline & Sync Settings */}
              {selectedSection === 'offlineSync' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Offline & Sync Settings</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Configure offline mode and data synchronization settings. Enable offline-first mode to work without internet and sync when connected.
                  </p>

                  {/* Cache Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <HardDrive size={24} className="mx-auto mb-2 text-blue-600" weight="duotone" />
                      <div className="text-2xl font-bold text-blue-700">{cacheStats.items}</div>
                      <div className="text-xs text-blue-600">Cached Items</div>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                      <Users size={24} className="mx-auto mb-2 text-green-600" weight="duotone" />
                      <div className="text-2xl font-bold text-green-700">{cacheStats.parties}</div>
                      <div className="text-xs text-green-600">Cached Parties</div>
                    </div>
                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
                      <Receipt size={24} className="mx-auto mb-2 text-purple-600" weight="duotone" />
                      <div className="text-2xl font-bold text-purple-700">{cacheStats.invoices}</div>
                      <div className="text-xs text-purple-600">Cached Invoices</div>
                    </div>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                      <CloudArrowUp size={24} className="mx-auto mb-2 text-yellow-600" weight="duotone" />
                      <div className="text-2xl font-bold text-yellow-700">{cacheStats.pendingSync}</div>
                      <div className="text-xs text-yellow-600">Pending Sync</div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <button
                      onClick={handleCacheAllData}
                      disabled={isCaching}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      <CloudArrowDown size={18} weight="bold" />
                      {isCaching ? 'Caching...' : 'Cache All Data Now'}
                    </button>
                    <button
                      onClick={handleClearOfflineCache}
                      className="flex items-center gap-2 px-4 py-2.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash size={18} weight="bold" />
                      Clear Offline Cache
                    </button>
                  </div>

                  {/* Offline Mode Settings */}
                  <div className="space-y-6">
                    <div className="p-6 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <WifiHigh size={28} weight="duotone" className="text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-lg">Work Offline First</h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={offlineSyncSettings.offlineFirstMode}
                                onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, offlineFirstMode: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Save all data locally first, then sync to cloud when internet is available. Best for areas with unreliable internet.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sync Settings */}
                    <div className="p-6 border border-border rounded-lg space-y-4">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <ArrowsClockwise size={20} weight="duotone" />
                        Sync Settings
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm font-medium">Auto Sync</span>
                          <input
                            type="checkbox"
                            checked={offlineSyncSettings.autoSync}
                            onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, autoSync: e.target.checked })}
                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm font-medium">Sync Only on WiFi</span>
                          <input
                            type="checkbox"
                            checked={offlineSyncSettings.syncOnlyOnWifi}
                            onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, syncOnlyOnWifi: e.target.checked })}
                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm font-medium">Instant Sync</span>
                          <input
                            type="checkbox"
                            checked={offlineSyncSettings.instantSync}
                            onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, instantSync: e.target.checked })}
                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                          />
                        </label>

                        <div className="p-3 bg-muted/30 rounded-lg">
                          <label className="block text-sm font-medium mb-1">Sync Interval</label>
                          <select
                            value={offlineSyncSettings.syncInterval}
                            onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, syncInterval: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                          >
                            <option value={15}>Every 15 seconds</option>
                            <option value={30}>Every 30 seconds</option>
                            <option value={60}>Every 1 minute</option>
                            <option value={300}>Every 5 minutes</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Cache Settings */}
                    <div className="p-6 border border-border rounded-lg space-y-4">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <HardDrive size={20} weight="duotone" />
                        Cache Settings
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm font-medium">Cache Items</span>
                          <input
                            type="checkbox"
                            checked={offlineSyncSettings.cacheItems}
                            onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, cacheItems: e.target.checked })}
                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm font-medium">Cache Parties</span>
                          <input
                            type="checkbox"
                            checked={offlineSyncSettings.cacheParties}
                            onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, cacheParties: e.target.checked })}
                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                          />
                        </label>

                        <label className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <span className="text-sm font-medium">Cache Invoices</span>
                          <input
                            type="checkbox"
                            checked={offlineSyncSettings.cacheInvoices}
                            onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, cacheInvoices: e.target.checked })}
                            className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                          />
                        </label>

                        <div className="p-3 bg-muted/30 rounded-lg">
                          <label className="block text-sm font-medium mb-1">Cache Size Limit</label>
                          <select
                            value={offlineSyncSettings.localCacheSize}
                            onChange={(e) => setOfflineSyncSettings({ ...offlineSyncSettings, localCacheSize: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                          >
                            <option value={100}>100 MB</option>
                            <option value={250}>250 MB</option>
                            <option value={500}>500 MB</option>
                            <option value={1000}>1 GB</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Last Sync Info */}
                    {cacheStats.lastSync && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">
                          <strong>Last synced:</strong> {new Date(cacheStats.lastSync).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Save Button */}
                    <button
                      onClick={handleSaveOfflineSettings}
                      className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Save Offline & Sync Settings
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Backup & Export */}
              {selectedSection === 'backup' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Data Export & Backup</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Export your business data for backup, migration, or analysis. All exports include complete data with proper formatting.
                  </p>

                  <div className="space-y-4">
                    {/* Complete Data Export */}
                    <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <Database size={28} weight="duotone" className="text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-2">Complete Data Export</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Export all your business data including invoices, customers, suppliers, and inventory in a single Excel file with multiple sheets. Perfect for complete backup or migration to other systems.
                          </p>
                          <button
                            onClick={async () => {
                              try {
                                toast.loading('Preparing complete export...')
                                const result = await exportCompleteData('My Business')
                                toast.success(`✅ Export Complete!\n📊 ${result.invoices} Invoices\n👥 ${result.parties} Parties\n📦 ${result.items} Items\n\nFile: ${result.fileName}`)
                              } catch (error) {
                                toast.error('Export failed. Please try again.')
                              }
                            }}
                            className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
                          >
                            <Database size={20} />
                            Export Complete Data
                          </button>
                          <p className="text-xs text-muted-foreground mt-3">
                            📥 Exports as multi-sheet Excel file with Summary, Invoices, Customers & Suppliers, and Inventory
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Individual Exports */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Export Invoices */}
                      <div className="p-5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <Receipt size={24} weight="duotone" className="text-accent" />
                          <h3 className="font-semibold">Export Invoices</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Download all sales and purchase invoices with payment details, tax breakdown, and status.
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              toast.loading('Exporting invoices...')
                              const result = await exportInvoicesOnly()
                              toast.success(`✅ Exported ${result.count} invoices!\n\nFile: ${result.fileName}`)
                            } catch (error) {
                              toast.error('Export failed')
                            }
                          }}
                          className="w-full px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-lg font-medium hover:bg-accent/20 transition-colors"
                        >
                          📄 Export Invoices
                        </button>
                      </div>

                      {/* Export Parties */}
                      <div className="p-5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <Users size={24} weight="duotone" className="text-success" />
                          <h3 className="font-semibold">Export Customers & Suppliers</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Export all customer and supplier details including contact info, GSTIN, and current balance.
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              toast.loading('Exporting parties...')
                              const result = await exportPartiesOnly()
                              toast.success(`✅ Exported ${result.count} customers & suppliers!\n\nFile: ${result.fileName}`)
                            } catch (error) {
                              toast.error('Export failed')
                            }
                          }}
                          className="w-full px-4 py-2 bg-success/10 text-success border border-success/20 rounded-lg font-medium hover:bg-success/20 transition-colors"
                        >
                          👥 Export Parties
                        </button>
                      </div>

                      {/* Export Items */}
                      <div className="p-5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <Package size={24} weight="duotone" className="text-warning" />
                          <h3 className="font-semibold">Export Inventory</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Download complete inventory list with pricing, stock levels, HSN codes, and tax rates.
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              toast.loading('Exporting inventory...')
                              const result = await exportItemsOnly()
                              toast.success(`✅ Exported ${result.count} items!\n\nFile: ${result.fileName}`)
                            } catch (error) {
                              toast.error('Export failed')
                            }
                          }}
                          className="w-full px-4 py-2 bg-warning/10 text-warning border border-warning/20 rounded-lg font-medium hover:bg-warning/20 transition-colors"
                        >
                          📦 Export Items
                        </button>
                      </div>

                      {/* JSON Backup */}
                      <div className="p-5 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <Database size={24} weight="duotone" className="text-info" />
                          <h3 className="font-semibold">JSON Backup</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create exact JSON backup for precise data restore. Includes all metadata and relationships.
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              toast.loading('Creating JSON backup...')
                              const result = await createBackupJSON()
                              toast.success(`✅ Backup created!\n\nFile: ${result.fileName}\nTotal Records: ${result.totalRecords}`)
                            } catch (error) {
                              toast.error('Backup failed')
                            }
                          }}
                          className="w-full px-4 py-2 bg-info/10 text-info border border-info/20 rounded-lg font-medium hover:bg-info/20 transition-colors"
                        >
                          💾 Create JSON Backup
                        </button>
                      </div>
                    </div>

                    {/* Export Info */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <Bell size={18} weight="duotone" />
                        Export Information
                      </h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span><strong>Excel Format:</strong> Easy to open in Excel, Google Sheets, or any spreadsheet software</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span><strong>JSON Format:</strong> For exact data backup and restore, or for developers</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span><strong>Migration Ready:</strong> Exported data can be imported into Zoho, Tally, or other CRM systems</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span><strong>Data Safety:</strong> Regular backups recommended for data security</span>
                        </li>
                      </ul>
                    </div>

                    {/* Coming Soon: Import */}
                    <div className="p-5 bg-muted/30 border border-dashed border-muted-foreground/30 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <Database size={24} weight="duotone" className="text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold mb-2 flex items-center gap-2">
                            Data Import
                            <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">Coming Soon</span>
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Import data from Zoho, Tally, Excel, or JSON backups. Bulk upload customers, suppliers, items, and invoices.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Transaction Settings */}
              {selectedSection === 'transaction' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Transaction Settings</h2>
                  <div className="space-y-6">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Invoice Preferences</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={transactionSettings.autoGenerateInvoiceNumbers}
                          onChange={(e) => setTransactionSettings({...transactionSettings, autoGenerateInvoiceNumbers: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Auto-generate invoice numbers</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={transactionSettings.showTermsOnInvoice}
                          onChange={(e) => setTransactionSettings({...transactionSettings, showTermsOnInvoice: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Show terms and conditions on invoice</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={transactionSettings.requireApproval}
                          onChange={(e) => setTransactionSettings({...transactionSettings, requireApproval: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Require approval before finalizing</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Invoice Prefix</label>
                      <input
                        type="text"
                        value={transactionSettings.invoicePrefix}
                        onChange={(e) => setTransactionSettings({...transactionSettings, invoicePrefix: e.target.value})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Next Invoice Number</label>
                      <input
                        type="number"
                        value={transactionSettings.nextInvoiceNumber}
                        onChange={(e) => setTransactionSettings({...transactionSettings, nextInvoiceNumber: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                      />
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Payment Terms</h3>
                      <div>
                        <label className="block text-sm mb-2">Default Payment Terms</label>
                        <select
                          value={transactionSettings.defaultPaymentTerms}
                          onChange={(e) => setTransactionSettings({...transactionSettings, defaultPaymentTerms: e.target.value as 'due_on_receipt' | 'net_15' | 'net_30' | 'net_45' | 'net_60'})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        >
                          <option value="due_on_receipt">Due on Receipt</option>
                          <option value="net_15">Net 15 Days</option>
                          <option value="net_30">Net 30 Days</option>
                          <option value="net_45">Net 45 Days</option>
                          <option value="net_60">Net 60 Days</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveTransactionSettings}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      Save Transaction Settings
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Invoice Print Settings */}
              {selectedSection === 'invoice' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Invoice Print Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Invoice Template</label>
                      <select
                        value={invoicePrintSettings.template}
                        onChange={(e) => setInvoicePrintSettings({...invoicePrintSettings, template: e.target.value as 'classic' | 'modern' | 'minimal' | 'professional'})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                      >
                        <option value="classic">Classic</option>
                        <option value="modern">Modern</option>
                        <option value="minimal">Minimal</option>
                        <option value="professional">Professional</option>
                      </select>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Print Options</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={invoicePrintSettings.showLogo}
                          onChange={(e) => setInvoicePrintSettings({...invoicePrintSettings, showLogo: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Show company logo</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={invoicePrintSettings.showBankDetails}
                          onChange={(e) => setInvoicePrintSettings({...invoicePrintSettings, showBankDetails: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Show bank details</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={invoicePrintSettings.showPaymentQR}
                          onChange={(e) => setInvoicePrintSettings({...invoicePrintSettings, showPaymentQR: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Show payment QR code</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={invoicePrintSettings.showSignature}
                          onChange={(e) => setInvoicePrintSettings({...invoicePrintSettings, showSignature: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Show authorized signature</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Footer Text</label>
                      <textarea
                        rows={3}
                        value={invoicePrintSettings.footerText}
                        onChange={(e) => setInvoicePrintSettings({...invoicePrintSettings, footerText: e.target.value})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                        placeholder="Thank you for your business!"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Paper Size</label>
                      <select
                        value={invoicePrintSettings.paperSize}
                        onChange={(e) => setInvoicePrintSettings({...invoicePrintSettings, paperSize: e.target.value as 'a4' | 'letter' | 'thermal'})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                      >
                        <option value="a4">A4</option>
                        <option value="letter">Letter</option>
                        <option value="thermal">Thermal (3 inch)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleSaveInvoicePrintSettings}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      Save Print Settings
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Invoice Table Column Settings */}
              {selectedSection === 'invoiceTable' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Invoice Table Column Settings</h2>
                  <p className="text-sm text-muted-foreground mb-6">Customize the column headings and visibility for the invoice item table in the Sales page.</p>

                  <div className="space-y-6">
                    {/* Column Labels Section */}
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h3 className="font-medium mb-4">Column Labels</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm mb-2">Serial No Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.serialNoLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, serialNoLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="#"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Item Name Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.itemNameLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, itemNameLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="Item Name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">HSN Code Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.hsnCodeLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, hsnCodeLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="HSN"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Description Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.descriptionLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, descriptionLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="Description"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Quantity Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.qtyLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, qtyLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="Qty"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Unit Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.unitLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, unitLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="Unit"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Tax Mode Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.taxModeLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, taxModeLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="Tax Mode"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">MRP Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.mrpLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, mrpLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="MRP"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Taxable Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.taxableLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, taxableLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="Taxable"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Discount % Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.discountPercentLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, discountPercentLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="Disc %"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Discount Amount Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.discountAmountLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, discountAmountLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="Disc ₹"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">GST % Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.gstPercentLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, gstPercentLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="GST %"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">GST Amount Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.gstAmountLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, gstAmountLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="GST ₹"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">CGST Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.cgstLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, cgstLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="CGST%"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">SGST Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.sgstLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, sgstLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="SGST%"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">IGST Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.igstLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, igstLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="IGST%"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Total Label</label>
                          <input
                            type="text"
                            value={invoiceTableColumnSettings.totalLabel}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, totalLabel: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="Total"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Column Visibility Section */}
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-medium mb-4">Default Column Visibility</h3>
                      <p className="text-xs text-muted-foreground mb-4">Set which columns are visible by default when creating a new invoice.</p>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50">
                          <div>
                            <p className="font-medium text-sm">HSN Code</p>
                            <p className="text-xs text-muted-foreground">Show HSN/SAC code column</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={invoiceTableColumnSettings.showHsnCode}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, showHsnCode: e.target.checked})}
                            className="rounded w-5 h-5"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50">
                          <div>
                            <p className="font-medium text-sm">Description</p>
                            <p className="text-xs text-muted-foreground">Show item description column</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={invoiceTableColumnSettings.showDescription}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, showDescription: e.target.checked})}
                            className="rounded w-5 h-5"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50">
                          <div>
                            <p className="font-medium text-sm">Tax Mode</p>
                            <p className="text-xs text-muted-foreground">Show inclusive/exclusive tax mode column</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={invoiceTableColumnSettings.showTaxMode}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, showTaxMode: e.target.checked})}
                            className="rounded w-5 h-5"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50">
                          <div>
                            <p className="font-medium text-sm">Discount</p>
                            <p className="text-xs text-muted-foreground">Show discount % and amount columns</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={invoiceTableColumnSettings.showDiscount}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, showDiscount: e.target.checked})}
                            className="rounded w-5 h-5"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50">
                          <div>
                            <p className="font-medium text-sm">GST Breakdown</p>
                            <p className="text-xs text-muted-foreground">Show CGST/SGST/IGST separate columns</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={invoiceTableColumnSettings.showGstBreakdown}
                            onChange={(e) => setInvoiceTableColumnSettings({...invoiceTableColumnSettings, showGstBreakdown: e.target.checked})}
                            className="rounded w-5 h-5"
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveInvoiceTableColumnSettings}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Save Invoice Table Settings
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Taxes & GST */}
              {selectedSection === 'taxes' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Taxes & GST Settings</h2>
                  <div className="space-y-6">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h3 className="font-medium mb-3">GST Registration</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2">GSTIN</label>
                          <input
                            type="text"
                            value={taxSettings.gstin}
                            onChange={(e) => setTaxSettings({...taxSettings, gstin: e.target.value})}
                            className="w-full px-3 py-2 border border-border rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Registration Type</label>
                          <select
                            value={taxSettings.registrationType}
                            onChange={(e) => setTaxSettings({...taxSettings, registrationType: e.target.value as 'regular' | 'composition'})}
                            className="w-full px-3 py-2 border border-border rounded-lg"
                          >
                            <option value="regular">Regular</option>
                            <option value="composition">Composition</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h3 className="font-medium mb-3">Tax Rates</h3>
                      <div className="space-y-2">
                        {[
                          { rate: '0%', desc: 'Zero-rated supplies', key: 'enableGST0' as const },
                          { rate: '5%', desc: 'Essential goods & services', key: 'enableGST5' as const },
                          { rate: '12%', desc: 'Standard goods', key: 'enableGST12' as const },
                          { rate: '18%', desc: 'Most goods & services', key: 'enableGST18' as const },
                          { rate: '28%', desc: 'Luxury items', key: 'enableGST28' as const }
                        ].map((tax) => (
                          <div key={tax.rate} className="flex items-center justify-between p-2 bg-background rounded">
                            <div>
                              <p className="font-medium text-sm">GST {tax.rate}</p>
                              <p className="text-xs text-muted-foreground">{tax.desc}</p>
                            </div>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={taxSettings[tax.key]}
                                onChange={(e) => setTaxSettings({...taxSettings, [tax.key]: e.target.checked})}
                                className="rounded"
                              />
                              <span className="text-xs">Enable</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Additional Tax Settings</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={taxSettings.applyReverseCharge}
                          onChange={(e) => setTaxSettings({...taxSettings, applyReverseCharge: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Apply reverse charge mechanism</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={taxSettings.includeCess}
                          onChange={(e) => setTaxSettings({...taxSettings, includeCess: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Include cess in calculations</span>
                      </label>
                    </div>

                    <div className="p-4 bg-success/5 rounded-lg border border-success/20">
                      <h3 className="font-medium mb-3 flex items-center gap-2">
                        <span className="text-success">⚡</span>
                        Default Tax Mode (Vyapar Style)
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        Choose how prices are entered by default. This affects new items and invoices.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Selling Price (Default)</label>
                          <select
                            value={taxSettings.defaultTaxMode}
                            onChange={(e) => setTaxSettings({...taxSettings, defaultTaxMode: e.target.value as 'inclusive' | 'exclusive'})}
                            className="w-full px-3 py-2 border border-border rounded-lg"
                          >
                            <option value="exclusive">Without GST (GST alag se) - ₹100 + GST = ₹118</option>
                            <option value="inclusive">With GST (Final amount) - ₹100 with GST included</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Purchase Price (Default)</label>
                          <select
                            value={taxSettings.defaultPurchaseTaxMode}
                            onChange={(e) => setTaxSettings({...taxSettings, defaultPurchaseTaxMode: e.target.value as 'inclusive' | 'exclusive'})}
                            className="w-full px-3 py-2 border border-border rounded-lg"
                          >
                            <option value="exclusive">Without GST (GST alag se) - ₹100 + GST = ₹118</option>
                            <option value="inclusive">With GST (Final amount) - ₹100 with GST included</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-info/10 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          <strong>How it works:</strong><br/>
                          • <strong>Without GST:</strong> You enter ₹100 → App adds GST → Final = ₹118 (Most common)<br/>
                          • <strong>With GST:</strong> You enter ₹100 → App calculates base ₹84.75 + GST ₹15.25 = ₹100<br/>
                          • "Without GST" means GST alag se add hoga | "With GST" means final amount customer ko pay karna hai
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveTaxSettings}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      Save Tax Settings
                    </button>
                  </div>
                </motion.div>
              )}

              {/* User Management */}
              {selectedSection === 'users' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* Admin Only Check */}
                  {!isAdmin ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Warning size={32} className="text-yellow-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">Admin Access Required</h3>
                      <p className="text-slate-500">Only administrators can manage users. Please contact your admin for access.</p>
                    </div>
                  ) : (
                    <>
                      {/* Offline Banner */}
                      {isOffline && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <WifiHigh size={20} className="text-amber-600" weight="bold" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-amber-800">You're Offline</h4>
                            <p className="text-xs text-amber-600">Viewing cached user data. Some features are disabled until you're back online.</p>
                          </div>
                        </div>
                      )}

                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold">User Management</h2>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Add and manage staff members for your business</p>
                        </div>
                        {userManagementTab === 'users' && (
                          <button
                            onClick={() => setShowAddUserModal(true)}
                            disabled={isOffline}
                            className={cn(
                              "flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto",
                              isOffline
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-700"
                            )}
                          >
                            <Plus size={18} weight="bold" />
                            Add Staff Member
                          </button>
                        )}
                      </div>

                      {/* Sub-tabs */}
                      <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 border-b border-slate-200 overflow-x-auto">
                        <button
                          onClick={() => setUserManagementTab('users')}
                          className={cn(
                            "px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                            userManagementTab === 'users'
                              ? "border-primary text-primary"
                              : "border-transparent text-slate-500 hover:text-slate-700"
                          )}
                        >
                          <Users size={14} className="inline-block mr-1.5 sm:mr-2 -mt-0.5" />
                          Users
                        </button>
                        <button
                          onClick={() => setUserManagementTab('permissions')}
                          className={cn(
                            "px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                            userManagementTab === 'permissions'
                              ? "border-primary text-primary"
                              : "border-transparent text-slate-500 hover:text-slate-700"
                          )}
                        >
                          <Lock size={14} className="inline-block mr-1.5 sm:mr-2 -mt-0.5" />
                          Permissions
                        </button>
                      </div>

                      {/* Users Tab Content */}
                      {userManagementTab === 'users' && (
                        <>
                      {/* Search Bar */}
                      <div className="mb-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>

                      {/* Users List */}
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : companyUsers.length === 0 ? (
                        <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed">
                          <UserCircle size={48} className="mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No staff members yet. Add your first staff member to get started.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {companyUsers.filter(user => {
                            if (!userSearchQuery) return true
                            const query = userSearchQuery.toLowerCase()
                            return (user.displayName || '').toLowerCase().includes(query) ||
                                   (user.email || '').toLowerCase().includes(query)
                          }).length === 0 ? (
                            <div className="p-8 text-center bg-muted/30 rounded-xl border border-dashed">
                              <p className="text-muted-foreground">No users match your search.</p>
                            </div>
                          ) : companyUsers.filter(user => {
                            if (!userSearchQuery) return true
                            const query = userSearchQuery.toLowerCase()
                            return (user.displayName || '').toLowerCase().includes(query) ||
                                   (user.email || '').toLowerCase().includes(query)
                          }).map((user) => (
                            <div key={user.uid} className="p-3 sm:p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                                <div className="flex items-center gap-3 sm:gap-4">
                                  {/* Avatar */}
                                  <div className={cn(
                                    "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-lg font-bold flex-shrink-0",
                                    user.role === 'admin' ? "bg-purple-100 text-purple-600" :
                                    user.role === 'manager' ? "bg-blue-100 text-blue-600" :
                                    "bg-green-100 text-green-600"
                                  )}>
                                    {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>

                                  {/* User Info */}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{user.displayName || 'Unnamed User'}</p>
                                      {user.uid === userData?.uid && (
                                        <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-slate-100 text-slate-500 rounded">(You)</span>
                                      )}
                                    </div>
                                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                                      <span className={cn(
                                        "text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-medium border capitalize",
                                        getRoleBadgeColor(user.role)
                                      )}>
                                        {user.role === 'admin' && <ShieldCheck size={10} className="inline mr-0.5 sm:mr-1" />}
                                        {user.role}
                                      </span>
                                      <span className={cn(
                                        "text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full",
                                        user.status === 'active'
                                          ? "bg-green-100 text-green-700"
                                          : "bg-red-100 text-red-700"
                                      )}>
                                        {user.status || 'active'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions - Only for non-admin users and not self */}
                                {user.role !== 'admin' && user.uid !== userData?.uid && (
                                  <div className="flex items-center gap-2 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                    {/* Role Change */}
                                    <select
                                      value={user.role}
                                      onChange={(e) => handleChangeRole(user.uid, e.target.value as 'manager' | 'cashier')}
                                      disabled={isOffline}
                                      className={cn(
                                        "text-xs sm:text-sm px-2 sm:px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-primary/20 flex-1 sm:flex-none",
                                        isOffline ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white"
                                      )}
                                    >
                                      <option value="manager">Manager</option>
                                      <option value="cashier">Cashier</option>
                                    </select>

                                    {/* Status Toggle */}
                                    <button
                                      onClick={() => handleChangeStatus(user.uid, user.status === 'active' ? 'inactive' : 'active')}
                                      disabled={isOffline}
                                      className={cn(
                                        "px-2 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg font-medium transition-colors flex-1 sm:flex-none",
                                        isOffline
                                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                          : user.status === 'active'
                                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                            : "bg-green-100 text-green-700 hover:bg-green-200"
                                      )}
                                    >
                                      {user.status === 'active' ? 'Deactivate' : 'Activate'}
                                    </button>

                                    {/* Delete */}
                                    <button
                                      onClick={() => handleDeleteUser(user.uid, user.displayName || user.email)}
                                      disabled={isOffline}
                                      className={cn(
                                        "p-2 rounded-lg transition-colors",
                                        isOffline ? "text-gray-300 cursor-not-allowed" : "text-red-500 hover:bg-red-50"
                                      )}
                                      title={isOffline ? "Offline - Cannot delete" : "Delete user"}
                                    >
                                      <Trash size={18} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Role Permissions Info */}
                      <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h4 className="font-semibold text-blue-800 mb-2 sm:mb-3 text-sm sm:text-base">Role Permissions</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                              <ShieldCheck size={14} className="text-purple-600" />
                              <span className="font-medium text-purple-700 text-xs sm:text-sm">Admin</span>
                            </div>
                            <p className="text-slate-600 text-[11px] sm:text-sm">Full access to all features, settings, reports, and user management</p>
                          </div>
                          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                              <User size={14} className="text-blue-600" />
                              <span className="font-medium text-blue-700 text-xs sm:text-sm">Manager</span>
                            </div>
                            <p className="text-slate-600 text-[11px] sm:text-sm">Access to sales, purchases, inventory, reports, and limited settings</p>
                          </div>
                          <div className="bg-white p-2.5 sm:p-3 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                              <UserCircle size={14} className="text-green-600" />
                              <span className="font-medium text-green-700 text-xs sm:text-sm">Cashier</span>
                            </div>
                            <p className="text-slate-600 text-[11px] sm:text-sm">Access to POS, sales, and basic operations only</p>
                          </div>
                        </div>
                      </div>
                        </>
                      )}

                      {/* Page Permissions Tab Content */}
                      {userManagementTab === 'permissions' && (
                        <>
                      {/* Search Bar */}
                      <div className="mb-4">
                        <div className="relative">
                          <input
                            type="text"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>

                      {/* Users List */}
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
                          <div className="col-span-5">User</div>
                          <div className="col-span-3">Role</div>
                          <div className="col-span-2 text-center">Pages</div>
                          <div className="col-span-2 text-center">Action</div>
                        </div>

                        {/* User Rows */}
                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                          {(() => {
                            const filteredUsers = companyUsers.filter(u => {
                              if (!userSearchQuery) return true
                              const query = userSearchQuery.toLowerCase()
                              return (u.displayName || '').toLowerCase().includes(query) ||
                                     (u.email || '').toLowerCase().includes(query)
                            })

                            if (filteredUsers.length === 0) {
                              return (
                                <div className="px-4 py-8 text-center text-slate-500">
                                  {companyUsers.length === 0
                                    ? 'No users found. Add staff members in User Management first.'
                                    : 'No matching users found'}
                                </div>
                              )
                            }

                            return filteredUsers.map((user) => {
                              const permissions = getUserPermissionsSync(user.uid, user.role)
                              const enabledCount = PAGE_INFO.filter(p => permissions[p.key]).length

                              return (
                                <div
                                  key={user.uid}
                                  className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50 transition-colors"
                                >
                                  {/* User Info */}
                                  <div className="col-span-5">
                                    <p className="font-medium text-slate-800">{user.displayName || 'No Name'}</p>
                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                  </div>

                                  {/* Role Badge */}
                                  <div className="col-span-3">
                                    <span className={cn(
                                      "inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize",
                                      user.role === 'admin' && "bg-purple-100 text-purple-700",
                                      user.role === 'manager' && "bg-blue-100 text-blue-700",
                                      user.role === 'cashier' && "bg-green-100 text-green-700"
                                    )}>
                                      {user.role}
                                    </span>
                                  </div>

                                  {/* Pages Count */}
                                  <div className="col-span-2 text-center">
                                    {user.role === 'admin' ? (
                                      <span className="text-sm text-purple-600 font-medium">All</span>
                                    ) : (
                                      <span className="text-sm text-slate-600">{enabledCount}/{PAGE_INFO.length}</span>
                                    )}
                                  </div>

                                  {/* Edit Button */}
                                  <div className="col-span-2 text-center">
                                    {user.role === 'admin' ? (
                                      <span className="text-xs text-slate-400">Full Access</span>
                                    ) : (
                                      <button
                                        onClick={() => handleSelectPermissionUser(user.uid)}
                                        disabled={isOffline}
                                        className={cn(
                                          "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                                          isOffline
                                            ? "text-gray-400 cursor-not-allowed"
                                            : "text-primary hover:bg-primary/10"
                                        )}
                                      >
                                        {isOffline ? 'Offline' : 'Edit'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>

                      {/* Info Box */}
                      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h4 className="font-semibold text-blue-800 mb-2">How it works</h4>
                        <ul className="text-sm text-slate-600 space-y-1">
                          <li>• Click Edit to manage page access for each user</li>
                          <li>• Toggle pages ON or OFF using checkboxes</li>
                          <li>• Changes take effect immediately after saving</li>
                          <li>• Admins always have full access to all pages</li>
                        </ul>
                      </div>
                        </>
                      )}

                  {/* Permission Edit Modal */}
                  {showPermissionModal && selectedPermissionUser && userPermissions && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                      >
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">Edit Page Permissions</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-slate-600">
                                {companyUsers.find(u => u.uid === selectedPermissionUser)?.displayName || 'User'}
                              </span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500">
                                {companyUsers.find(u => u.uid === selectedPermissionUser)?.email}
                              </span>
                              <span className={cn(
                                "ml-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                                companyUsers.find(u => u.uid === selectedPermissionUser)?.role === 'manager'
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-green-100 text-green-700"
                              )}>
                                {companyUsers.find(u => u.uid === selectedPermissionUser)?.role}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={handleClosePermissionModal}
                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <XCircle size={24} className="text-slate-400" />
                          </button>
                        </div>

                        {/* Modal Body - Permissions Grid */}
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {PAGE_INFO.map((page) => (
                              <label
                                key={page.key}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                  userPermissions[page.key]
                                    ? "bg-green-50 border-green-300"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={userPermissions[page.key]}
                                  onChange={() => handleTogglePagePermission(page.key)}
                                  className="w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-slate-800">{page.label}</p>
                                  <p className="text-xs text-slate-500">{page.labelTa}</p>
                                </div>
                                {userPermissions[page.key] ? (
                                  <CheckCircle size={20} weight="fill" className="text-green-500" />
                                ) : (
                                  <XCircle size={20} weight="fill" className="text-slate-300" />
                                )}
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                          <button
                            onClick={handleResetToRoleDefaults}
                            className="text-sm px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Reset to Defaults
                          </button>
                          <div className="flex gap-3">
                            <button
                              onClick={handleClosePermissionModal}
                              className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                handleSavePagePermissions()
                                handleClosePermissionModal()
                              }}
                              disabled={isSavingPermissions}
                              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              {isSavingPermissions ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle size={18} weight="bold" />
                                  Save Changes
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Add User Modal */}
              {showAddUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-slate-800">Add New Staff Member</h3>
                      <button
                        onClick={() => setShowAddUserModal(false)}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                      >
                        <XCircle size={24} className="text-slate-400" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={newUserName}
                          onChange={(e) => setNewUserName(e.target.value)}
                          placeholder="Enter staff name"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="staff@business.com"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input
                          type="password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                        />
                      </div>

                      {/* Role */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Role</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setNewUserRole('manager')}
                            className={cn(
                              "p-4 rounded-xl border-2 text-left transition-all",
                              newUserRole === 'manager'
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <User size={24} className={newUserRole === 'manager' ? "text-blue-600" : "text-slate-400"} />
                            <p className="font-semibold mt-2">Manager</p>
                            <p className="text-xs text-slate-500 mt-1">Sales, inventory & reports</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewUserRole('cashier')}
                            className={cn(
                              "p-4 rounded-xl border-2 text-left transition-all",
                              newUserRole === 'cashier'
                                ? "border-green-500 bg-green-50"
                                : "border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <UserCircle size={24} className={newUserRole === 'cashier' ? "text-green-600" : "text-slate-400"} />
                            <p className="font-semibold mt-2">Cashier</p>
                            <p className="text-xs text-slate-500 mt-1">POS & sales only</p>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowAddUserModal(false)}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateUser}
                        disabled={isCreatingUser}
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isCreatingUser ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus size={18} weight="bold" />
                            Create User
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Admin Re-authentication Modal */}
              {showAdminReauth && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                  >
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} className="text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">User Created Successfully!</h3>
                      {pendingNewUser && (
                        <p className="text-slate-500 mt-2">
                          <span className="font-medium">{pendingNewUser.displayName}</span> has been added as a <span className="font-medium capitalize">{pendingNewUser.role}</span>
                        </p>
                      )}
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> You've been signed out. Please enter your password to sign back in as admin.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Your Email</label>
                        <input
                          type="email"
                          value={userData?.email || ''}
                          disabled
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Your Password</label>
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="Enter your admin password"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          onKeyDown={(e) => e.key === 'Enter' && handleAdminReauth()}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAdminReauth}
                      className="w-full mt-6 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      Sign Back In
                    </button>
                  </motion.div>
                </div>
              )}

              {/* Add Unit Modal */}
              {showAddUnitModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-slate-800">Add New Unit</h3>
                      <button
                        onClick={() => setShowAddUnitModal(false)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <X size={20} className="text-slate-400" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit Name</label>
                        <input
                          type="text"
                          value={newUnitName}
                          onChange={(e) => setNewUnitName(e.target.value.toUpperCase())}
                          placeholder="e.g., KG, LTR, PCS, BOX"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newUnitName.trim()) {
                              if (!itemSettings.itemUnits.includes(newUnitName.trim())) {
                                setItemSettings({...itemSettings, itemUnits: [...itemSettings.itemUnits, newUnitName.trim()]})
                                toast.success(`Unit "${newUnitName.trim()}" added successfully`)
                              } else {
                                toast.error('Unit already exists')
                              }
                              setShowAddUnitModal(false)
                              setNewUnitName('')
                            }
                          }}
                        />
                        <p className="text-xs text-slate-500 mt-1.5">Enter unit abbreviation (auto-converts to uppercase)</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={() => {
                          setShowAddUnitModal(false)
                          setNewUnitName('')
                        }}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (newUnitName.trim()) {
                            if (!itemSettings.itemUnits.includes(newUnitName.trim())) {
                              setItemSettings({...itemSettings, itemUnits: [...itemSettings.itemUnits, newUnitName.trim()]})
                              toast.success(`Unit "${newUnitName.trim()}" added successfully`)
                            } else {
                              toast.error('Unit already exists')
                            }
                            setShowAddUnitModal(false)
                            setNewUnitName('')
                          }
                        }}
                        disabled={!newUnitName.trim()}
                        className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Add Unit
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Delete Unit Confirmation Modal */}
              {showDeleteUnitModal && unitToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6"
                  >
                    <div className="text-center">
                      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash size={28} className="text-red-600" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Unit?</h3>
                      <p className="text-sm text-slate-500">
                        Are you sure you want to delete the unit <span className="font-semibold text-slate-700">"{unitToDelete}"</span>? This action cannot be undone.
                      </p>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => {
                          setShowDeleteUnitModal(false)
                          setUnitToDelete(null)
                        }}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setItemSettings({...itemSettings, itemUnits: itemSettings.itemUnits.filter(u => u !== unitToDelete)})
                          toast.success(`Unit "${unitToDelete}" deleted`)
                          setShowDeleteUnitModal(false)
                          setUnitToDelete(null)
                        }}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Add Party Category Modal */}
              {showAddCategoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-slate-800">Add Party Category</h3>
                      <button
                        onClick={() => setShowAddCategoryModal(false)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <X size={20} className="text-slate-400" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Category Name</label>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="e.g., Wholesale, Retail, VIP"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newCategoryName.trim()) {
                              if (!partySettings.partyCategories.includes(newCategoryName.trim())) {
                                setPartySettings({...partySettings, partyCategories: [...partySettings.partyCategories, newCategoryName.trim()]})
                                toast.success(`Category "${newCategoryName.trim()}" added successfully`)
                              } else {
                                toast.error('Category already exists')
                              }
                              setShowAddCategoryModal(false)
                              setNewCategoryName('')
                            }
                          }}
                        />
                        <p className="text-xs text-slate-500 mt-1.5">Enter a name to categorize your parties/customers</p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-5">
                      <button
                        onClick={() => {
                          setShowAddCategoryModal(false)
                          setNewCategoryName('')
                        }}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (newCategoryName.trim()) {
                            if (!partySettings.partyCategories.includes(newCategoryName.trim())) {
                              setPartySettings({...partySettings, partyCategories: [...partySettings.partyCategories, newCategoryName.trim()]})
                              toast.success(`Category "${newCategoryName.trim()}" added successfully`)
                            } else {
                              toast.error('Category already exists')
                            }
                            setShowAddCategoryModal(false)
                            setNewCategoryName('')
                          }
                        }}
                        disabled={!newCategoryName.trim()}
                        className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Add Category
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Delete Party Category Confirmation Modal */}
              {showDeleteCategoryModal && categoryToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 sm:p-6"
                  >
                    <div className="text-center">
                      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash size={28} className="text-red-600" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Category?</h3>
                      <p className="text-sm text-slate-500">
                        Are you sure you want to delete the category <span className="font-semibold text-slate-700">"{categoryToDelete}"</span>? This action cannot be undone.
                      </p>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => {
                          setShowDeleteCategoryModal(false)
                          setCategoryToDelete(null)
                        }}
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium hover:bg-slate-50 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setPartySettings({...partySettings, partyCategories: partySettings.partyCategories.filter(c => c !== categoryToDelete)})
                          toast.success(`Category "${categoryToDelete}" deleted`)
                          setShowDeleteCategoryModal(false)
                          setCategoryToDelete(null)
                        }}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* SMS Settings */}
              {selectedSection === 'sms' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Transactional SMS</h2>
                  <div className="space-y-6">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">SMS Credits</h3>
                        <span className="text-2xl font-bold text-primary">{smsSettings.smsCredits}</span>
                      </div>
                      <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
                        Buy More Credits
                      </button>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">SMS Notifications</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={smsSettings.sendOnInvoiceCreation}
                          onChange={(e) => setSmsSettings({...smsSettings, sendOnInvoiceCreation: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Send SMS on invoice creation</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={smsSettings.sendPaymentReminders}
                          onChange={(e) => setSmsSettings({...smsSettings, sendPaymentReminders: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Send payment reminders</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={smsSettings.sendDeliveryUpdates}
                          onChange={(e) => setSmsSettings({...smsSettings, sendDeliveryUpdates: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Send delivery updates</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">SMS Template</label>
                      <textarea
                        rows={4}
                        value={smsSettings.smsTemplate}
                        onChange={(e) => setSmsSettings({...smsSettings, smsTemplate: e.target.value})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                      ></textarea>
                      <p className="text-xs text-muted-foreground mt-1">
                        Available variables: {'{customer}, {invoice_no}, {amount}, {link}'}
                      </p>
                    </div>

                    <button
                      onClick={handleSaveSMSSettings}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      Save SMS Settings
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Reminders */}
              {selectedSection === 'reminders' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Reminder Settings</h2>
                  <div className="space-y-6">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Payment Reminders</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reminderSettings.sendOverdueReminders}
                          onChange={(e) => setReminderSettings({...reminderSettings, sendOverdueReminders: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Send reminders for overdue payments</span>
                      </label>
                      <div className="ml-6">
                        <label className="block text-sm mb-2">Remind before (days)</label>
                        <input
                          type="number"
                          value={reminderSettings.remindBeforeDays}
                          onChange={(e) => setReminderSettings({...reminderSettings, remindBeforeDays: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Stock Reminders</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reminderSettings.alertLowStock}
                          onChange={(e) => setReminderSettings({...reminderSettings, alertLowStock: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Alert for low stock items</span>
                      </label>
                      <div className="ml-6">
                        <label className="block text-sm mb-2">Low stock threshold</label>
                        <input
                          type="number"
                          value={reminderSettings.lowStockThreshold}
                          onChange={(e) => setReminderSettings({...reminderSettings, lowStockThreshold: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-border rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Notification Channels</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reminderSettings.emailNotifications}
                          onChange={(e) => setReminderSettings({...reminderSettings, emailNotifications: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Email notifications</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reminderSettings.smsNotifications}
                          onChange={(e) => setReminderSettings({...reminderSettings, smsNotifications: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">SMS notifications</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={reminderSettings.whatsappNotifications}
                          onChange={(e) => setReminderSettings({...reminderSettings, whatsappNotifications: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">WhatsApp notifications</span>
                      </label>
                    </div>

                    <button
                      onClick={handleSaveReminderSettings}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      Save Reminder Settings
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Party Settings */}
              {selectedSection === 'party' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Party Settings</h2>
                  <div className="space-y-6">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Party Preferences</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={partySettings.requireGSTIN}
                          onChange={(e) => setPartySettings({...partySettings, requireGSTIN: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Require GSTIN for all parties</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={partySettings.enableCreditLimit}
                          onChange={(e) => setPartySettings({...partySettings, enableCreditLimit: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Enable credit limit management</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={partySettings.trackLedgerAutomatically}
                          onChange={(e) => setPartySettings({...partySettings, trackLedgerAutomatically: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Track party ledger automatically</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Default Credit Period (Days)</label>
                      <input
                        type="number"
                        value={partySettings.defaultCreditPeriod}
                        onChange={(e) => setPartySettings({...partySettings, defaultCreditPeriod: parseInt(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                      />
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Party Categories</h3>
                      <div className="space-y-2">
                        {partySettings.partyCategories.map((category) => (
                          <div key={category} className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border">
                            <span className="text-sm font-medium">{category}</span>
                            <button
                              onClick={() => {
                                setCategoryToDelete(category)
                                setShowDeleteCategoryModal(true)
                              }}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setNewCategoryName('')
                            setShowAddCategoryModal(true)
                          }}
                          className="w-full px-3 py-2.5 bg-primary/10 text-primary text-sm rounded-lg hover:bg-primary/20 font-medium transition-colors"
                        >
                          + Add Category
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSavePartySettings}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      Save Party Settings
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Item Settings */}
              {selectedSection === 'items' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Item Settings</h2>
                  <div className="space-y-6">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Item Preferences</h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={itemSettings.autoGenerateSKU}
                          onChange={(e) => setItemSettings({...itemSettings, autoGenerateSKU: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Auto-generate SKU codes</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={itemSettings.trackInventory}
                          onChange={(e) => setItemSettings({...itemSettings, trackInventory: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Track inventory for all items</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={itemSettings.enableBarcode}
                          onChange={(e) => setItemSettings({...itemSettings, enableBarcode: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Enable barcode scanning</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={itemSettings.allowNegativeStock}
                          onChange={(e) => setItemSettings({...itemSettings, allowNegativeStock: e.target.checked})}
                          className="rounded"
                        />
                        <span className="text-sm">Allow negative stock</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Default Tax Rate</label>
                      <select
                        value={itemSettings.defaultTaxRate}
                        onChange={(e) => setItemSettings({...itemSettings, defaultTaxRate: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-border rounded-lg"
                      >
                        <option value="0">GST 0%</option>
                        <option value="5">GST 5%</option>
                        <option value="12">GST 12%</option>
                        <option value="18">GST 18%</option>
                        <option value="28">GST 28%</option>
                      </select>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <h3 className="font-medium">Item Units</h3>
                      <div className="space-y-2">
                        {itemSettings.itemUnits.map((unit) => (
                          <div key={unit} className="flex items-center justify-between p-2.5 bg-background rounded-lg border border-border">
                            <span className="text-sm font-medium">{unit}</span>
                            <button
                              onClick={() => {
                                setUnitToDelete(unit)
                                setShowDeleteUnitModal(true)
                              }}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setNewUnitName('')
                            setShowAddUnitModal(true)
                          }}
                          className="w-full px-3 py-2.5 bg-primary/10 text-primary text-sm rounded-lg hover:bg-primary/20 font-medium transition-colors"
                        >
                          + Add Unit
                        </button>
                      </div>
                    </div>

                    {/* Product Categories Management */}
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag size={20} className="text-emerald-600" />
                        <h3 className="font-bold text-emerald-800">Product Categories</h3>
                      </div>
                      <p className="text-xs text-emerald-600 mb-3">
                        Manage categories for your inventory items. These will appear in POS and Inventory.
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {(itemSettings.productCategories || []).map((category) => (
                          <div key={category} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-emerald-200">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-emerald-500" />
                              <span className="text-sm font-medium">{category}</span>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${category}" category?`)) {
                                  setItemSettings({
                                    ...itemSettings,
                                    productCategories: (itemSettings.productCategories || []).filter(c => c !== category)
                                  })
                                  toast.success(`Category "${category}" removed`)
                                }
                              }}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <input
                          type="text"
                          placeholder="Enter new category name (e.g., Medical)"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newCategoryName.trim()) {
                              if ((itemSettings.productCategories || []).includes(newCategoryName.trim())) {
                                toast.error('Category already exists')
                              } else {
                                setItemSettings({
                                  ...itemSettings,
                                  productCategories: [...(itemSettings.productCategories || []), newCategoryName.trim()]
                                })
                                toast.success(`Category "${newCategoryName.trim()}" added`)
                                setNewCategoryName('')
                              }
                            }
                          }}
                          className="flex-1 px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <button
                          onClick={() => {
                            if (newCategoryName.trim()) {
                              if ((itemSettings.productCategories || []).includes(newCategoryName.trim())) {
                                toast.error('Category already exists')
                              } else {
                                setItemSettings({
                                  ...itemSettings,
                                  productCategories: [...(itemSettings.productCategories || []), newCategoryName.trim()]
                                })
                                toast.success(`Category "${newCategoryName.trim()}" added`)
                                setNewCategoryName('')
                              }
                            }
                          }}
                          disabled={!newCategoryName.trim()}
                          className="px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          + Add
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveItemSettings}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                    >
                      Save Item Settings
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Utilities */}
              {selectedSection === 'utilities' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Utilities</h2>
                  <div className="space-y-6">
                    {/* Bulk Update Tax Slab */}
                    <div className="p-4 sm:p-6 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-3 mb-4">
                        <Tag size={28} weight="duotone" className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-base sm:text-lg">Bulk Update Tax Slab</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Update tax rates for all items at once
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">From Tax Rate</label>
                          <select className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white">
                            <option value="">Select current rate</option>
                            <option value="0">GST 0%</option>
                            <option value="5">GST 5%</option>
                            <option value="12">GST 12%</option>
                            <option value="18">GST 18%</option>
                            <option value="28">GST 28%</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2">To Tax Rate</label>
                          <select className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-white">
                            <option value="">Select new rate</option>
                            <option value="0">GST 0%</option>
                            <option value="5">GST 5%</option>
                            <option value="12">GST 12%</option>
                            <option value="18">GST 18%</option>
                            <option value="28">GST 28%</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => toast.info('Bulk tax update feature coming soon!')}
                        className="w-full px-4 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 text-sm sm:text-base"
                      >
                        Update Tax Rates
                      </button>
                    </div>

                    {/* Team Sharing */}
                    <div className="p-4 sm:p-6 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3 mb-4">
                        <ShareNetwork size={28} weight="duotone" className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-bold text-base sm:text-lg">Team Sharing</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Invite team members to collaborate on your business
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="email"
                            placeholder="Enter team member email"
                            className="flex-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-white"
                          />
                          <select className="px-3 py-2.5 text-sm border border-border rounded-lg bg-white sm:w-28">
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </div>
                        <button
                          onClick={() => toast.info('Team invite feature coming soon!')}
                          className="w-full px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 text-sm sm:text-base"
                        >
                          Send Invite
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="p-4 sm:p-6 bg-muted/50 rounded-lg">
                      <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4">Quick Actions</h3>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <button
                          onClick={() => toast.info('Recalculating balances...')}
                          className="p-3 sm:p-4 bg-background border border-border rounded-lg text-xs sm:text-sm font-medium hover:bg-muted text-left"
                        >
                          <ArrowsClockwise size={20} className="mb-1.5 sm:mb-2 text-primary" />
                          <span className="block leading-tight">Recalculate Balances</span>
                        </button>
                        <button
                          onClick={() => toast.info('Verifying stock levels...')}
                          className="p-3 sm:p-4 bg-background border border-border rounded-lg text-xs sm:text-sm font-medium hover:bg-muted text-left"
                        >
                          <Database size={20} className="mb-1.5 sm:mb-2 text-primary" />
                          <span className="block leading-tight">Verify Stock</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Developer Tools */}
              {selectedSection === 'developer' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-xl font-bold mb-6">Developer Tools</h2>
                  <div className="space-y-6">
                    <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <Database size={32} weight="duotone" className="text-primary" />
                        <div>
                          <h3 className="font-bold text-lg">Generate Dummy Data</h3>
                          <p className="text-sm text-muted-foreground">
                            Generate comprehensive dummy data to test all features and reports
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">Customers</p>
                          <p className="text-lg font-bold">15</p>
                        </div>
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">Suppliers</p>
                          <p className="text-lg font-bold">10</p>
                        </div>
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">Items</p>
                          <p className="text-lg font-bold">15</p>
                        </div>
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">Sales</p>
                          <p className="text-lg font-bold">50</p>
                        </div>
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">Purchases</p>
                          <p className="text-lg font-bold">40</p>
                        </div>
                        <div className="p-3 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">Challans</p>
                          <p className="text-lg font-bold">20</p>
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateDummyData}
                        disabled={isGenerating}
                        className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Database size={20} />
                        {isGenerating ? 'Generating...' : 'Generate Dummy Data'}
                      </button>

                      <p className="text-xs text-muted-foreground mt-3">
                        ⚠️ This will add dummy parties, items, sales, purchases, delivery challans, and purchase orders to your database for testing.
                      </p>
                    </div>

                    <div className="p-6 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <Trash size={32} weight="duotone" className="text-destructive" />
                        <div>
                          <h3 className="font-bold text-lg">Clear All Data</h3>
                          <p className="text-sm text-muted-foreground">
                            Remove all data from local storage (parties, items, transactions, etc.)
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleClearAllData}
                        className="w-full px-4 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 flex items-center justify-center gap-2"
                      >
                        <Trash size={20} />
                        Clear All Data
                      </button>

                      <p className="text-xs text-destructive mt-3">
                        ⚠️ Warning: This action is irreversible and will delete ALL your data!
                      </p>
                    </div>

                    <div className="p-6 bg-accent/5 border border-accent/20 rounded-lg">
                      <h3 className="font-bold mb-3">Available Reports</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-background rounded">✓ Sale Report</div>
                        <div className="p-2 bg-background rounded">✓ Purchase Report</div>
                        <div className="p-2 bg-background rounded">✓ Day Book</div>
                        <div className="p-2 bg-background rounded">✓ Bill-wise Profit</div>
                        <div className="p-2 bg-background rounded">✓ Profit & Loss</div>
                        <div className="p-2 bg-background rounded">✓ Cash Flow</div>
                        <div className="p-2 bg-background rounded">✓ Balance Sheet</div>
                        <div className="p-2 bg-background rounded">✓ Trial Balance</div>
                        <div className="p-2 bg-background rounded">✓ Party Statement</div>
                        <div className="p-2 bg-background rounded">✓ Party-wise P&L</div>
                        <div className="p-2 bg-background rounded">✓ GSTR-1</div>
                        <div className="p-2 bg-background rounded">✓ GSTR-3B</div>
                        <div className="p-2 bg-background rounded">✓ HSN Summary</div>
                        <div className="p-2 bg-background rounded">✓ Stock Summary</div>
                        <div className="p-2 bg-background rounded">✓ Item-wise P&L</div>
                        <div className="p-2 bg-background rounded">✓ Discount Report</div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Navigate to Reports page to view all these reports with the generated dummy data.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Language Settings Section Component
const LanguageSettingsSection = () => {
  const { language, setLanguage, availableLanguages, t } = useLanguage()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-xl font-bold mb-2">Language Settings</h2>
      <p className="text-muted-foreground text-sm mb-6">மொழி அமைப்புகள் - Choose your preferred language</p>
      
      <div className="space-y-6">
        {/* Language Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {availableLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={cn(
                "p-6 rounded-xl border-2 transition-all text-left",
                language === lang.code
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{lang.flag}</span>
                <div>
                  <h3 className="font-bold text-lg">{lang.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {lang.code === 'en' ? 'English Language' : 'தமிழ் மொழி'}
                  </p>
                </div>
              </div>
              {language === lang.code && (
                <div className="mt-3 flex items-center gap-2 text-primary text-sm font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {lang.code === 'en' ? 'Currently Active' : 'தற்போது செயலில்'}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Preview Section */}
        <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-border">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Globe size={20} weight="duotone" />
            {language === 'en' ? 'Language Preview' : 'மொழி முன்னோட்டம்'}
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-background rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">{t.nav.dashboard}</p>
              <p className="font-medium">{t.common.today}</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">{t.nav.sales}</p>
              <p className="font-medium">{t.sales.newSale}</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">{t.nav.inventory}</p>
              <p className="font-medium">{t.inventory.items}</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">{t.common.total}</p>
              <p className="font-medium">{t.common.amount}</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">{t.common.save}</p>
              <p className="font-medium">{t.common.cancel}</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">{t.parties.customer}</p>
              <p className="font-medium">{t.parties.supplier}</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>{language === 'en' ? 'Note:' : 'குறிப்பு:'}</strong>{' '}
            {language === 'en' 
              ? 'Language changes will apply immediately across the entire application. Some system messages may still appear in English.'
              : 'மொழி மாற்றங்கள் முழு பயன்பாட்டிலும் உடனடியாக பொருந்தும். சில கணினி செய்திகள் ஆங்கிலத்தில் தோன்றலாம்.'
            }
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default Settings
