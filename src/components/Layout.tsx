import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  House,
  Receipt,
  ShoppingCart,
  Users,
  Package,
  ChartLine,
  List,
  X,
  Sparkle,
  Moon,
  Sun,
  Wallet,
  Bank,
  Gear,
  FileText,
  DotsThreeOutline,
  SignOut,
  Headset,
  Storefront
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { signOut, type UserRole } from '../services/authService'
import { canAccessPage, PagePermissions } from '../services/permissionsService'
import { toast } from 'sonner'
import AIAssistant from './AIAssistant'
import SyncStatusIndicator from './SyncStatusIndicator'
import { useLanguage } from '../contexts/LanguageContext'

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { userData } = useAuth()

  // Add/remove data attribute to body when mobile menu opens/closes
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.setAttribute('data-mobile-menu-open', 'true')
    } else {
      document.body.removeAttribute('data-mobile-menu-open')
    }
    return () => {
      document.body.removeAttribute('data-mobile-menu-open')
    }
  }, [isMobileMenuOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.user-dropdown-container')) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  // PWA Install Handler
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Android Back Button Handler - Proper navigation with exit confirmation on dashboard
  useEffect(() => {
    let lastBackPress = 0

    const handleBackButton = (e: PopStateEvent) => {
      // If mobile menu is open, close it instead of navigating back
      if (isMobileMenuOpen) {
        e.preventDefault()
        setIsMobileMenuOpen(false)
        window.history.pushState(null, '', window.location.href)
        return
      }

      // If on dashboard (home page), show exit confirmation
      if (location.pathname === '/' || location.pathname === '/dashboard') {
        e.preventDefault()
        const now = Date.now()

        if (now - lastBackPress < 2000) {
          // Second press within 2 seconds - show confirmation and exit
          const confirmExit = window.confirm('Are you sure you want to exit the app?')
          if (confirmExit) {
            // User confirmed - close app
            // Try multiple methods to exit the app
            try {
              // Method 1: Try to close the window (works in some browsers)
              window.close()
            } catch (err) {
              // Ignore error
            }

            // Method 2: For Android WebView/PWA - minimize by clearing history
            try {
              if (window.history.length > 1) {
                window.history.go(-(window.history.length))
              } else {
                // Navigate to about:blank as last resort
                window.location.href = 'about:blank'
              }
            } catch (err) {
              // Ignore error
            }
          } else {
            // User cancelled - stay on dashboard
            window.history.pushState(null, '', window.location.href)
            lastBackPress = 0 // Reset timer
          }
        } else {
          // First press - show toast message
          lastBackPress = now
          toast.info('Press back again to exit', { duration: 2000 })
          window.history.pushState(null, '', window.location.href)
        }
      } else {
        // Not on dashboard - allow normal back navigation
        // React Router will handle the navigation automatically
        // No need to prevent default or push state
      }
    }

    // Only push state if we're on the dashboard to prevent exit
    if (location.pathname === '/' || location.pathname === '/dashboard') {
      window.history.pushState(null, '', window.location.href)
    }

    window.addEventListener('popstate', handleBackButton)

    return () => {
      window.removeEventListener('popstate', handleBackButton)
    }
  }, [location.pathname, isMobileMenuOpen, navigate])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If no prompt available, show instructions
      toast.info('To install: Click the install icon in your browser address bar, or use browser menu > Install App')
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      toast.success('App installed successfully!')
    }
    setDeferredPrompt(null)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  const { t } = useLanguage()

  // All navigation items with role-based access control and page permission keys
  const allNavigationItems: Array<{
    path: string
    label: string
    icon: any
    color: string
    allowedRoles?: UserRole[]
    pageKey?: keyof PagePermissions
  }> = [
    { path: '/', label: t.nav.dashboard, icon: House, color: 'primary', pageKey: 'dashboard' },
    { path: '/sales', label: t.nav.sales, icon: Receipt, color: 'success', pageKey: 'sales' },
    { path: '/pos', label: t.nav.pos, icon: Storefront, color: 'success', pageKey: 'pos' },
    { path: '/purchases', label: t.nav.purchases, icon: ShoppingCart, color: 'warning', allowedRoles: ['admin', 'manager'], pageKey: 'purchases' },
    { path: '/quotations', label: t.nav.quotations, icon: FileText, color: 'accent', pageKey: 'quotations' },
    { path: '/parties', label: t.nav.parties, icon: Users, color: 'accent', allowedRoles: ['admin', 'manager'], pageKey: 'parties' },
    { path: '/expenses', label: t.nav.expenses, icon: Wallet, color: 'destructive', allowedRoles: ['admin', 'manager'], pageKey: 'expenses' },
    { path: '/inventory', label: t.nav.inventory, icon: Package, color: 'primary', allowedRoles: ['admin', 'manager'], pageKey: 'inventory' },
    { path: '/reports', label: t.nav.reports, icon: ChartLine, color: 'success', allowedRoles: ['admin', 'manager'], pageKey: 'reports' },
    { path: '/banking', label: t.nav.banking, icon: Bank, color: 'primary', allowedRoles: ['admin', 'manager'], pageKey: 'banking' },
    { path: '/more', label: t.nav.others, icon: DotsThreeOutline, color: 'accent', pageKey: 'others' },
    { path: '/settings', label: t.nav.settings, icon: Gear, color: 'secondary', allowedRoles: ['admin'], pageKey: 'settings' }
  ]

  // Filter navigation items based on user role AND page permissions
  // Page permissions take PRIORITY over role-based restrictions
  const navigationItems = allNavigationItems.filter(item => {
    // No user data - hide all items
    if (!userData?.uid || !userData?.role) return false

    // Admin always sees everything
    if (userData.role === 'admin') return true

    // Check page-level permissions FIRST (takes priority over role restrictions)
    // If admin has explicitly granted permission for this page, show it regardless of role
    if (item.pageKey) {
      return canAccessPage(userData.uid, userData.role, item.pageKey)
    }

    // For items without pageKey, fall back to role-based restriction
    if (item.allowedRoles && !item.allowedRoles.includes(userData.role)) {
      return false
    }

    return true
  })

  return (
    <div className="min-h-screen bg-background overflow-x-hidden max-w-[100vw]">
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        {/* Mobile Menu Button - Only visible on mobile */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <List size={24} weight="bold" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkle size={20} weight="duotone" className="text-primary" />
            <span className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Billi
            </span>
            <span className="text-xs text-muted-foreground">• {getGreeting()} 👋</span>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusIndicator size="sm" showLabel={false} />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isDarkMode ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
            </motion.button>
          </div>
        </div>

        {/* Desktop Navigation - BILLI 2025 Purple/Orange Design */}
        <nav className="hidden lg:flex items-center bg-brand-gradient px-3 py-2 gap-1" style={{ scrollbarWidth: 'none' }}>
          {/* Billi Logo with Animation (Dashboard) */}
          <NavLink
            to="/"
            className={({ isActive }) => cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all whitespace-nowrap",
              isActive
                ? "bg-white text-[#5A18C9] font-semibold shadow-lg"
                : "text-white hover:bg-white/15"
            )}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="p-1 bg-white rounded-md shadow-sm"
            >
              <Sparkle size={14} weight="duotone" className="text-[#5A18C9]" />
            </motion.div>
            <span className="font-bold">Billi</span>
          </NavLink>

          {/* Navigation Items */}
          {navigationItems.filter(item => item.path !== '/').map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "px-3 py-2 text-[13px] font-medium rounded-lg transition-all whitespace-nowrap",
                isActive
                  ? "bg-white text-[#5A18C9] font-semibold shadow-lg"
                  : "text-white hover:bg-white/15"
              )}
            >
              {item.label}
            </NavLink>
          ))}

          {/* User Info + Actions - Right side */}
          <div className="ml-auto flex items-center gap-2">
            {/* Company + Dark Mode - Combined pill */}
            {userData && (
              <div className="relative user-dropdown-container flex items-center">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-white rounded-l-full border-y border-l border-white/30 shadow-sm hover:bg-white/95 transition-colors cursor-pointer"
                >
                  <span className="text-[12px] font-semibold text-slate-700 whitespace-nowrap">
                    {userData.companyName || 'Company'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    ({userData.role})
                  </span>
                </button>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 bg-white/90 rounded-r-full border-y border-r border-white/30 hover:bg-white transition-colors text-slate-600"
                  title="Toggle Dark Mode"
                >
                  {isDarkMode ? <Sun size={14} weight="bold" /> : <Moon size={14} weight="bold" />}
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isUserDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
                    >
                      {/* User Info Header */}
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-800 truncate">{userData.displayName || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{userData.email}</p>
                      </div>

                      {/* Logout Option */}
                      <button
                        onClick={() => {
                          setIsUserDropdownOpen(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <SignOut size={18} weight="duotone" />
                        <span className="font-medium">{t.nav.logout}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="fixed left-0 top-0 h-full w-72 bg-card border-r border-border shadow-2xl z-50 lg:hidden flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="p-2 bg-white rounded-lg shadow-sm"
                  >
                    <Sparkle size={20} weight="duotone" className="text-primary" />
                  </motion.div>
                  <h2 className="text-lg font-bold">Billing Pro</h2>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* User Info Section - Mobile */}
              {userData && (
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    {/* Avatar with Role Color */}
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm",
                      userData.role === 'admin' ? "bg-purple-500" :
                      userData.role === 'manager' ? "bg-blue-500" :
                      "bg-green-500"
                    )}>
                      {userData.displayName?.charAt(0)?.toUpperCase() || userData.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{userData.displayName || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{userData.email}</p>
                      <span className={cn(
                        "inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                        userData.role === 'admin' ? "bg-purple-100 text-purple-700" :
                        userData.role === 'manager' ? "bg-blue-100 text-blue-700" :
                        "bg-green-100 text-green-700"
                      )}>
                        {userData.role}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <nav className="p-4 overflow-y-auto flex-1 pb-20">
                <div className="space-y-1">
                  {navigationItems.map((item, index) => (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <NavLink
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={({ isActive }) => cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                          "hover:bg-muted",
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                        )}
                      >
                        {({ isActive }) => (
                          <>
                            <div className={cn(
                              "p-2 rounded-lg transition-colors",
                              isActive && item.color === 'primary' && "bg-primary/10",
                              isActive && item.color === 'success' && "bg-success/10",
                              isActive && item.color === 'warning' && "bg-warning/10",
                              isActive && item.color === 'accent' && "bg-accent/10",
                              isActive && item.color === 'destructive' && "bg-destructive/10"
                            )}>
                              <item.icon 
                                size={20} 
                                weight={isActive ? "duotone" : "regular"}
                                className={cn(
                                  isActive && item.color === 'primary' && "text-primary",
                                  isActive && item.color === 'success' && "text-success",
                                  isActive && item.color === 'warning' && "text-warning",
                                  isActive && item.color === 'accent' && "text-accent",
                                  isActive && item.color === 'destructive' && "text-destructive"
                                )}
                              />
                            </div>
                            <span>{item.label}</span>
                            {isActive && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-auto w-2 h-2 bg-primary rounded-full"
                              />
                            )}
                          </>
                        )}
                      </NavLink>
                    </motion.div>
                  ))}
                </div>

                {/* Logout Button */}
                <div className="mt-6 pt-6 border-t border-border">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-red-50">
                      <SignOut size={20} weight="duotone" className="text-red-500" />
                    </div>
                    <span className="font-medium">{t.nav.logout}</span>
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="px-3 py-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkle size={16} weight="duotone" className="text-primary" />
                      <span className="text-sm font-medium">{t.nav.premiumFeatures}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.nav.unlockAdvanced}</p>
                    <button className="mt-3 w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                      {t.nav.upgradeNow}
                    </button>
                  </div>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content - Full Width Container */}
      <main className="min-h-[calc(100vh-140px)] lg:min-h-[calc(100vh-180px)] safe-area-content">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - 2025 Modern Design */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border/50 lg:hidden z-40 mobile-nav-floating safe-area-bottom">
        <div className="mobile-nav-scroll relative">
          {/* Left 2 icons */}
          {navigationItems.slice(0, 2).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
            className={({ isActive }) => cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all flex-shrink-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isActive && "bg-primary/10"
                    )}
                  >
                    <item.icon
                      size={24}
                      weight={isActive ? "duotone" : "regular"}
                    />
                  </motion.div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Center Voice AI Button - Floating */}
          <div className="relative -mt-8 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 bg-brand-gradient rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-4 border-card"
              onClick={() => {
                // Trigger AI Assistant from AIAssistantContext
                const event = new CustomEvent('toggle-ai-assistant')
                window.dispatchEvent(event)
              }}
            >
              <Sparkle size={28} weight="duotone" className="text-white" />
            </motion.button>
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-primary whitespace-nowrap">
              AI Bill
            </span>
          </div>

          {/* Right 2 icons */}
          {navigationItems.slice(2, 4).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
            className={({ isActive }) => cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all flex-shrink-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isActive && "bg-primary/10"
                    )}
                  >
                    <item.icon
                      size={24}
                      weight={isActive ? "duotone" : "regular"}
                    />
                  </motion.div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-muted-foreground flex-shrink-0"
          >
            <motion.div whileTap={{ scale: 0.9 }} className="p-1.5 rounded-lg">
              <DotsThreeOutline size={24} weight="regular" />
            </motion.div>
            <span className="text-[10px] font-medium">{t.nav.more}</span>
          </button>
        </div>
      </nav>

      {/* AI Voice Assistant - Floating button hidden, controlled from Sales page AI Bill button */}
      <AIAssistant hideFloatingButton={true} />
    </div>
  )
}

export default Layout

