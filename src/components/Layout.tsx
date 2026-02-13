import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  House, Receipt, Users, Package, ChartLine, List, X, Sparkle,
  Moon, Sun, Wallet, Bank, Gear, FileText, SignOut,
  Buildings
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../services/authService'
import { canAccessPage, PagePermissions } from '../services/permissionsService'
import { toast } from 'sonner'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const { userData } = useAuth()
  const userDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.dataset.mobileMenuOpen = isMobileMenuOpen ? 'true' : 'false'
    return () => { document.body.removeAttribute('data-mobile-menu-open') }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // Main navigation items (shown in top bar)
  const allNavigationItems: Array<{
    path: string;
    label: string;
    icon: React.ElementType;
    pageKey?: keyof PagePermissions;
    allowedRoles?: string[];
  }> = [
    { path: '/sales', label: t.nav.sales, icon: Receipt, pageKey: 'sales' },
    { path: '/inventory', label: t.nav.inventory, icon: Package, allowedRoles: ['admin', 'manager'], pageKey: 'inventory' },
    { path: '/parties', label: t.nav.parties, icon: Users, allowedRoles: ['admin', 'manager'], pageKey: 'parties' },
    { path: '/reports', label: t.nav.reports, icon: ChartLine, allowedRoles: ['admin', 'manager'], pageKey: 'reports' },
    { path: '/expenses', label: t.nav.expenses, icon: Wallet, allowedRoles: ['admin', 'manager'], pageKey: 'expenses' },
  ]

  // Items inside "More" dropdown
  const moreMenuItems: Array<{
    path: string;
    label: string;
    icon: React.ElementType;
    pageKey?: keyof PagePermissions;
    allowedRoles?: string[];
  }> = [
    { path: '/quotations', label: t.nav.quotations, icon: FileText, pageKey: 'quotations' },
    { path: '/crm', label: 'CRM', icon: Buildings, allowedRoles: ['admin', 'manager', 'sales'], pageKey: 'crm' },
    { path: '/banking', label: t.nav.banking, icon: Bank, allowedRoles: ['admin', 'manager'], pageKey: 'banking' },
  ]

  // Settings item (shown separately)
  const settingsItem = { path: '/settings', label: t.nav.settings, icon: Gear, allowedRoles: ['admin'], pageKey: 'settings' as keyof PagePermissions }

  const navigationItems = allNavigationItems.filter(item => {
    if (!userData?.uid || !userData?.role) return false
    if (userData.role === 'admin') return true
    if (item.pageKey) return canAccessPage(userData.uid, userData.role, item.pageKey)
    return !item.allowedRoles || item.allowedRoles.includes(userData.role)
  })

  const filteredMoreMenuItems = moreMenuItems.filter(item => {
    if (!userData?.uid || !userData?.role) return false
    if (userData.role === 'admin') return true
    if (item.pageKey) return canAccessPage(userData.uid, userData.role, item.pageKey)
    return !item.allowedRoles || item.allowedRoles.includes(userData.role)
  })

  const canAccessSettings = userData?.role === 'admin' || (userData?.uid && userData?.role && settingsItem.pageKey && canAccessPage(userData.uid, userData.role, settingsItem.pageKey))

  return (
    <div className="min-h-screen bg-[#e4ebf5] dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {/* Desktop Navigation - Neumorphic Style */}
      <header className="sticky top-0 z-50 hidden lg:block py-2 px-3 bg-[#e4ebf5] dark:bg-slate-900">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between h-11 px-3 rounded-2xl bg-[#e4ebf5] dark:bg-slate-800
            shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff]
            dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]">
            <div className="flex items-center gap-2">
              <nav className="flex items-center gap-0.5">
                {/* Dashboard (matches left HOME button) */}
                <NavLink
                  key="__dashboard"
                  to="/"
                  end
                  className={({ isActive }) => cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-blue-600 text-white shadow-[2px_2px_4px_#c5ccd6,-2px_-2px_4px_#ffffff]"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                  )}
                >
                  <House size={16} weight="bold" />
                  <span>{t.nav.dashboard}</span>
                </NavLink>

                {navigationItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-blue-600 text-white shadow-[2px_2px_4px_#c5ccd6,-2px_-2px_4px_#ffffff]"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    )}
                  >
                    <item.icon size={16} weight="bold" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}

                {/* More Menu Items - shown directly in top nav */}
                {filteredMoreMenuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-blue-600 text-white shadow-[2px_2px_4px_#c5ccd6,-2px_-2px_4px_#ffffff]"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    )}
                  >
                    <item.icon size={16} weight="bold" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}

                {/* Settings (matches left SETUP button) */}
                {canAccessSettings && (
                  <NavLink
                    key="__settings"
                    to={settingsItem.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-blue-600 text-white shadow-[2px_2px_4px_#c5ccd6,-2px_-2px_4px_#ffffff]"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    )}
                  >
                    <settingsItem.icon size={16} weight="bold" />
                    <span>{settingsItem.label}</span>
                  </NavLink>
                )}

                {/* Company button (no Profile page): dropdown for theme + sign out */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen((v) => !v)}
                    className={cn(
                      "flex items-center justify-center p-1.5 rounded-lg transition-all duration-200",
                      isUserDropdownOpen
                        ? "bg-blue-600 text-white shadow-[2px_2px_4px_#c5ccd6,-2px_-2px_4px_#ffffff]"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                    )}
                    title={userData?.companyName || 'Company'}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
                      {(() => {
                        const name = (userData?.companyName || userData?.displayName || 'T').trim()
                        const initials = name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map(w => w[0]?.toUpperCase())
                          .join('')
                        return initials || 'T'
                      })()}
                    </div>
                  </button>

                  {isUserDropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-1 z-[60]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          toggleDarkMode()
                          setIsUserDropdownOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                      >
                        {isDarkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-slate-600 dark:text-slate-300" />}
                        <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserDropdownOpen(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <SignOut size={18} weight="bold" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header - Neumorphic */}
      <header className="sticky top-0 z-40 lg:hidden px-3 py-2 bg-[#e4ebf5] dark:bg-slate-900">
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#e4ebf5] dark:bg-slate-800
          shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff]
          dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-[#e4ebf5] dark:bg-slate-700
              shadow-[3px_3px_6px_#c5ccd6,-3px_-3px_6px_#ffffff]
              dark:shadow-[3px_3px_6px_#1e293b,-3px_-3px_6px_#334155]
              active:shadow-[inset_2px_2px_4px_#c5ccd6,inset_-2px_-2px_4px_#ffffff]
              transition-all duration-200"
          >
            <List size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="text-base font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
            {userData?.companyName || 'My Business'}
          </h1>
          <div className="w-9"></div>
        </div>
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
              className="fixed inset-0 bg-black/60 z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 h-full w-72 bg-[#e4ebf5] dark:bg-slate-900 z-50 lg:hidden flex flex-col"
            >
              {/* Header with User Info */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center font-bold text-white
                    shadow-[3px_3px_6px_#c5ccd6,-3px_-3px_6px_#ffffff]">
                    {userData?.displayName?.charAt(0).toUpperCase() || 'A'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{userData?.displayName || 'User'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{userData?.role || 'Guest'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-[#e4ebf5] dark:bg-slate-800
                    shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff]
                    dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]
                    active:shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]
                    transition-all duration-200"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 overflow-y-auto px-4 space-y-2">
                {/* Main Navigation Items */}
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "text-blue-600 dark:text-blue-400 bg-[#e4ebf5] dark:bg-slate-800 shadow-[inset_4px_4px_8px_#c5ccd6,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#1e293b,inset_-4px_-4px_8px_#334155]"
                        : "text-slate-600 dark:text-slate-300 bg-[#e4ebf5] dark:bg-slate-800 shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155] active:shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]"
                    )}
                  >
                    <item.icon size={20} weight="duotone" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}

                {/* More Menu Items */}
                {filteredMoreMenuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "text-blue-600 dark:text-blue-400 bg-[#e4ebf5] dark:bg-slate-800 shadow-[inset_4px_4px_8px_#c5ccd6,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#1e293b,inset_-4px_-4px_8px_#334155]"
                        : "text-slate-600 dark:text-slate-300 bg-[#e4ebf5] dark:bg-slate-800 shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155] active:shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]"
                    )}
                  >
                    <item.icon size={20} weight="duotone" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}

                {/* Settings */}
                {canAccessSettings && (
                  <NavLink
                    to={settingsItem.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "text-blue-600 dark:text-blue-400 bg-[#e4ebf5] dark:bg-slate-800 shadow-[inset_4px_4px_8px_#c5ccd6,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#1e293b,inset_-4px_-4px_8px_#334155]"
                        : "text-slate-600 dark:text-slate-300 bg-[#e4ebf5] dark:bg-slate-800 shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155] active:shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]"
                    )}
                  >
                    <settingsItem.icon size={20} weight="duotone" />
                    <span>{settingsItem.label}</span>
                  </NavLink>
                )}
              </nav>

              {/* Bottom Actions */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#e4ebf5] dark:bg-slate-800
                  shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]
                  dark:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155]">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Dark Mode</span>
                  <button
                    onClick={toggleDarkMode}
                    className="p-2.5 rounded-xl bg-[#e4ebf5] dark:bg-slate-700
                      shadow-[3px_3px_6px_#c5ccd6,-3px_-3px_6px_#ffffff]
                      dark:shadow-[3px_3px_6px_#1e293b,-3px_-3px_6px_#334155]
                      active:shadow-[inset_2px_2px_4px_#c5ccd6,inset_-2px_-2px_4px_#ffffff]
                      transition-all duration-200"
                  >
                    {isDarkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-slate-600" />}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 rounded-xl
                    bg-[#e4ebf5] dark:bg-slate-800
                    shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff]
                    dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]
                    active:shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]
                    transition-all duration-200"
                >
                  <SignOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="max-w-[1800px] mx-auto px-3 py-2">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - Neumorphic */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-40 p-3 bg-[#e4ebf5] dark:bg-slate-900">
        <div className="flex justify-around items-center h-16 rounded-2xl bg-[#e4ebf5] dark:bg-slate-800
          shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff]
          dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]">
          {navigationItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-200",
                isActive
                  ? "text-blue-600 dark:text-blue-400 shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155]"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              <item.icon size={22} weight={"regular"} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default Layout;
