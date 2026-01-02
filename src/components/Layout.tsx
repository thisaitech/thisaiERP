import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  House, Receipt, ShoppingCart, Users, Package, ChartLine, List, X, Sparkle,
  Moon, Sun, Wallet, Bank, Gear, FileText, SignOut, Storefront, MagnifyingGlass, Bell, CaretDown,
  Buildings, Plus, UserPlus, Cube, Money, ArrowUDownLeft, CurrencyCircleDollar
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../services/authService'
import { canAccessPage, PagePermissions } from '../services/permissionsService'
import { toast } from 'sonner'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import { ViewOnlyBanner, SubscriptionNotification } from './SubscriptionBanner'

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isSidebarProfileOpen, setIsSidebarProfileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { userData, subscriptionState, showSubscriptionNotification, dismissSubscriptionNotification } = useAuth()
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const sidebarProfileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.dataset.mobileMenuOpen = isMobileMenuOpen ? 'true' : 'false'
    return () => { document.body.removeAttribute('data-mobile-menu-open') }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
      if (sidebarProfileRef.current && !sidebarProfileRef.current.contains(event.target as Node)) {
        setIsSidebarProfileOpen(false)
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
    { path: '/pos', label: t.nav.pos, icon: Storefront, pageKey: 'pos' },
    { path: '/purchases', label: t.nav.purchases, icon: ShoppingCart, allowedRoles: ['admin', 'manager'], pageKey: 'purchases' },
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
    { path: '/more', label: t.nav.others, icon: List, pageKey: 'others' },
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

  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false)
  const moreDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setIsMoreDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])



  return (
    <div className="min-h-screen bg-[#e4ebf5] dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {/* Desktop Navigation - Neumorphic Style */}
      <header className="sticky top-0 z-50 hidden lg:block py-2 px-3 bg-[#e4ebf5] dark:bg-slate-900">
        <div className="max-w-[1920px] mx-auto pl-[82px]">
          <div className="flex items-center justify-between h-11 px-3 rounded-2xl bg-[#e4ebf5] dark:bg-slate-800
            shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff]
            dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]">
            <div className="flex items-center gap-2">
              <nav className="flex items-center gap-0.5">
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

      {/* Left Side Quick Action Bar - Desktop Only */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-20 flex-col items-center gap-1.5 py-2 bg-[#e4ebf5] dark:bg-slate-800
        shadow-[4px_0px_12px_rgba(0,0,0,0.08)]
        dark:shadow-[4px_0px_12px_rgba(0,0,0,0.3)] overflow-y-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        {/* Logo at top */}
        <NavLink to="/" className="group relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 flex flex-col items-center justify-center
          shadow-[0_8px_32px_rgba(59,130,246,0.4),0_4px_12px_rgba(0,0,0,0.1)]
          hover:shadow-[0_12px_40px_rgba(59,130,246,0.5)] hover:scale-105 hover:-translate-y-1
          active:scale-95 transition-all duration-300 ease-out mb-2 overflow-hidden
          before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-transparent before:to-white/20"
        >
          <span className="text-[18px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">HOME</span>
          <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl border border-white/10">
            Anna - Home
          </span>
        </NavLink>

        {/* 1. POS Billing */}
        <button
          onClick={() => navigate('/pos?action=new')}
          className="group relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-600 flex flex-col items-center justify-center
            shadow-[0_8px_32px_rgba(139,92,246,0.4),0_4px_12px_rgba(0,0,0,0.1)]
            hover:shadow-[0_12px_40px_rgba(139,92,246,0.5)] hover:scale-105 hover:-translate-y-1
            active:scale-95 transition-all duration-300 ease-out overflow-hidden
            before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-transparent before:to-white/20"
          title="POS Billing"
        >
          <span className="text-[20px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">POS</span>
          <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl border border-white/10">
            POS Billing
          </span>
        </button>

        {/* 2. Create Invoice / Sale */}
        <button
          onClick={() => navigate('/sales?action=new')}
          className="group relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 flex flex-col items-center justify-center
            shadow-[0_8px_32px_rgba(16,185,129,0.4),0_4px_12px_rgba(0,0,0,0.1)]
            hover:shadow-[0_12px_40px_rgba(16,185,129,0.5)] hover:scale-105 hover:-translate-y-1
            active:scale-95 transition-all duration-300 ease-out overflow-hidden
            before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-transparent before:to-white/20"
          title="Create Invoice"
        >
          <span className="text-[18px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">SALE</span>
          <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl border border-white/10">
            Create Invoice / Sale
          </span>
        </button>

        {/* 3. Add Payment (In/Out) */}
        <button
          onClick={() => navigate('/banking?action=payment')}
          className="group relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 flex flex-col items-center justify-center
            shadow-[0_8px_32px_rgba(6,182,212,0.4),0_4px_12px_rgba(0,0,0,0.1)]
            hover:shadow-[0_12px_40px_rgba(6,182,212,0.5)] hover:scale-105 hover:-translate-y-1
            active:scale-95 transition-all duration-300 ease-out overflow-hidden
            before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-transparent before:to-white/20"
          title="Add Payment"
        >
          <span className="text-[20px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">PAY</span>
          <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl border border-white/10">
            Add Payment (In/Out)
          </span>
        </button>

        {/* 4. Add Party (Customer/Supplier) */}
        <button
          onClick={() => navigate('/parties?action=add')}
          className="group relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-pink-400 via-rose-500 to-red-600 flex flex-col items-center justify-center
            shadow-[0_8px_32px_rgba(244,63,94,0.4),0_4px_12px_rgba(0,0,0,0.1)]
            hover:shadow-[0_12px_40px_rgba(244,63,94,0.5)] hover:scale-105 hover:-translate-y-1
            active:scale-95 transition-all duration-300 ease-out overflow-hidden
            before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-transparent before:to-white/20"
          title="Add Party"
        >
          <span className="text-[16px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">PARTY</span>
          <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl border border-white/10">
            Add Party (Customer/Supplier)
          </span>
        </button>

        {/* 5. Add Product / Stock Update */}
        <button
          onClick={() => navigate('/inventory?action=add')}
          className="group relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 flex flex-col items-center justify-center
            shadow-[0_8px_32px_rgba(245,158,11,0.4),0_4px_12px_rgba(0,0,0,0.1)]
            hover:shadow-[0_12px_40px_rgba(245,158,11,0.5)] hover:scale-105 hover:-translate-y-1
            active:scale-95 transition-all duration-300 ease-out overflow-hidden
            before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-transparent before:to-white/20"
          title="Add Product"
        >
          <span className="text-[20px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">ITEM</span>
          <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl border border-white/10">
            Add Product / Stock Update
          </span>
        </button>

        {/* New Purchase */}
        <button
          onClick={() => navigate('/purchases?action=new')}
          className="group relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-orange-400 via-red-500 to-rose-600 flex flex-col items-center justify-center
            shadow-[0_8px_32px_rgba(249,115,22,0.4),0_4px_12px_rgba(0,0,0,0.1)]
            hover:shadow-[0_12px_40px_rgba(249,115,22,0.5)] hover:scale-105 hover:-translate-y-1
            active:scale-95 transition-all duration-300 ease-out overflow-hidden
            before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-transparent before:to-white/20"
          title="New Purchase"
        >
          <span className="text-[20px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">BUY</span>
          <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl border border-white/10">
            New Purchase
          </span>
        </button>

        {/* Add Expense */}
        <button
          onClick={() => navigate('/expenses?action=new')}
          className="group relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-red-400 via-rose-500 to-pink-600 flex flex-col items-center justify-center
            shadow-[0_8px_32px_rgba(225,29,72,0.4),0_4px_12px_rgba(0,0,0,0.1)]
            hover:shadow-[0_12px_40px_rgba(225,29,72,0.5)] hover:scale-105 hover:-translate-y-1
            active:scale-95 transition-all duration-300 ease-out overflow-hidden
            before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-transparent before:to-white/20"
          title="Add Expense"
        >
          <span className="text-[15px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">SPEND</span>
          <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl border border-white/10">
            Add Expense
          </span>
        </button>

        {/* New Quotation */}
        <button
          onClick={() => navigate('/quotations?action=new')}
          className="group relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-indigo-400 via-purple-500 to-violet-600 flex flex-col items-center justify-center
            shadow-[0_8px_32px_rgba(99,102,241,0.4),0_4px_12px_rgba(0,0,0,0.1)]
            hover:shadow-[0_12px_40px_rgba(99,102,241,0.5)] hover:scale-105 hover:-translate-y-1
            active:scale-95 transition-all duration-300 ease-out overflow-hidden
            before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-transparent before:to-white/20"
          title="New Quotation"
        >
          <span className="text-[16px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">QUOTE</span>
          <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl border border-white/10">
            New Quotation
          </span>
        </button>

        {/* Settings */}
        {canAccessSettings && (
          <button
            onClick={() => navigate('/settings')}
            className="group relative w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-slate-400 via-slate-500 to-slate-700 flex flex-col items-center justify-center
              shadow-[0_8px_32px_rgba(100,116,139,0.4),0_4px_12px_rgba(0,0,0,0.1)]
              hover:shadow-[0_12px_40px_rgba(100,116,139,0.5)] hover:scale-105 hover:-translate-y-1
              active:scale-95 transition-all duration-300 ease-out overflow-hidden
              before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-t before:from-transparent before:to-white/20"
            title="Settings"
          >
            <span className="text-[14px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">SETUP</span>
            <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800/95 backdrop-blur-sm text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 shadow-xl border border-white/10">
              Settings
            </span>
          </button>
        )}

        {/* Spacer to push profile to bottom */}
        <div className="flex-1" />

        {/* Profile with Company Info & Logout */}
        <div className="relative mb-2 mt-2" ref={sidebarProfileRef}>
          <button
            onClick={() => setIsSidebarProfileOpen(!isSidebarProfileOpen)}
            className="group relative w-[72px] h-[72px] rounded-2xl bg-[#e4ebf5] dark:bg-slate-700 flex items-center justify-center
              shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff]
              dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]
              hover:shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]
              dark:hover:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155]
              transition-all duration-200 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-lg font-bold text-white shadow-md">
              {userData?.companyName?.charAt(0).toUpperCase() || userData?.displayName?.charAt(0).toUpperCase() || 'A'}
            </div>
            {!isSidebarProfileOpen && (
              <span className="absolute left-full ml-4 px-3 py-2 rounded-xl bg-slate-800 text-white text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                {userData?.companyName || userData?.displayName || 'Profile'}
              </span>
            )}
          </button>

          {/* Profile Popup */}
          <AnimatePresence>
            {isSidebarProfileOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                className="fixed left-24 bottom-4 w-64 rounded-xl overflow-visible
                  bg-white dark:bg-slate-800
                  shadow-2xl border border-slate-200 dark:border-slate-700"
                style={{ zIndex: 9999 }}
              >
                <div className="p-4">
                  {/* Company Info */}
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-md">
                      {userData?.companyName?.charAt(0).toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                        {userData?.companyName || 'My Company'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Company</p>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-md">
                      {userData?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {userData?.displayName || 'User'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {userData?.role || 'guest'}
                      </p>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={() => {
                      setIsSidebarProfileOpen(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-semibold text-white rounded-lg
                      bg-gradient-to-r from-red-500 to-rose-600
                      hover:from-red-600 hover:to-rose-700
                      shadow-lg shadow-red-500/30
                      transition-all duration-200"
                  >
                    <SignOut size={20} weight="bold" />
                    <span>Logout</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* View-only banner when subscription expired */}
      <ViewOnlyBanner className="lg:pl-[82px]" />

      <main className="max-w-[1800px] mx-auto px-3 py-2 lg:pl-[82px]">
        <Outlet />
      </main>

      {/* Subscription expiry notification modal */}
      <SubscriptionNotification
        isOpen={showSubscriptionNotification}
        onClose={dismissSubscriptionNotification}
        onUpgrade={() => {
          dismissSubscriptionNotification()
          navigate('/settings?tab=subscription')
        }}
      />

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