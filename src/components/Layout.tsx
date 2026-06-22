import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  House, Receipt, Users, Package, ChartLine, List, X,
  Moon, Sun, Wallet, Bank, FileText, SignOut,
  Buildings, SquaresFour, UserList
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import { signOut } from '../services/authService'
import { canAccessPage, PagePermissions } from '../services/permissionsService'
import { migrateLegacyLocalDataToApi } from '../services/legacyDataMigrationService'
import { getItems } from '../services/itemService'
import { getParties } from '../services/partyService'
import { getInvoices } from '../services/invoiceService'
import { getExpenses } from '../services/expenseService'
import { getQuotations } from '../services/quotationService'
import { getLeads } from '../services/leadService'
import { getVisitors } from '../services/visitorService'
import { toast } from 'sonner'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import NotificationBell from './notifications/NotificationBell'
import useIsMobileViewport from '../hooks/useIsMobileViewport'

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/Dashboard'),
  '/sales': () => import('../pages/Sales'),
  '/inventory': () => import('../pages/Inventory'),
  '/parties': () => import('../pages/Parties'),
  '/expenses': () => import('../pages/Expenses'),
  '/quotations': () => import('../pages/Quotations'),
  '/settings': () => import('../pages/Settings'),
  '/reports': () => import('../pages/ReportsNew'),
  '/company-info': () => import('../pages/CompanyInfo'),
}

function scheduleIdle(callback: () => void, timeoutMs: number = 1200): { cancel: () => void } {
  const w = window as any
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(callback, { timeout: timeoutMs })
    return { cancel: () => w.cancelIdleCallback?.(id) }
  }
  const t = window.setTimeout(callback, Math.max(0, timeoutMs))
  return { cancel: () => window.clearTimeout(t) }
}

type ModulePalette = {
  accent: string
  accentStrong: string
  soft: string
  pageBg: string
  panelBg: string
  border: string
}

const MODULE_PALETTES: Array<{ path: string; palette: ModulePalette }> = [
  { path: '/sales', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
  { path: '/inventory', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
  { path: '/parties', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
  { path: '/reports', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
  { path: '/expenses', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
  { path: '/quotations', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
  { path: '/crm', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
  { path: '/banking', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
  { path: '/settings', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
  { path: '/company-info', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
  { path: '/', palette: { accent: '#2563eb', accentStrong: '#1d4ed8', soft: '#dbeafe', pageBg: '#eaf1fb', panelBg: '#f6f9ff', border: '#bfdbfe' } },
]

const getModulePalette = (pathname: string): ModulePalette => {
  for (const entry of MODULE_PALETTES) {
    if (entry.path === '/' && pathname === '/') return entry.palette
    if (entry.path !== '/' && (pathname === entry.path || pathname.startsWith(`${entry.path}/`))) return entry.palette
  }
  return MODULE_PALETTES[MODULE_PALETTES.length - 1].palette
}

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false)
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { userData } = useAuth()
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const isMobileViewport = useIsMobileViewport()

  const prefetchRoute = (path: string) => {
    const fn = routePrefetchers[path]
    if (!fn) return
    try {
      // Fire-and-forget. Vite will fetch the chunk and cache it in the browser.
      fn()
    } catch {
      // ignore
    }
  }

  const closeMobileDrawers = () => {
    setIsMobileMenuOpen(false)
    setIsMobileMoreOpen(false)
  }

  useEffect(() => {
    document.body.dataset.mobileMenuOpen = isMobileMenuOpen ? 'true' : 'false'
    document.body.dataset.mobileMoreOpen = isMobileMoreOpen ? 'true' : 'false'
    return () => {
      document.body.removeAttribute('data-mobile-menu-open')
      document.body.removeAttribute('data-mobile-more-open')
    }
  }, [isMobileMenuOpen, isMobileMoreOpen])

  useEffect(() => {
    const body = document.body
    const hasVisibleSheet = document.querySelector('.mobile-sheet-root') !== null
    if (!hasVisibleSheet && (body.dataset.mobileSheetLockCount || body.style.overflow === 'hidden')) {
      body.style.overflow = body.dataset.mobileSheetOverflowPrev || ''
      delete body.dataset.mobileSheetLockCount
      delete body.dataset.mobileSheetOverflowPrev
    }
  }, [location.pathname])

  // Always close mobile drawers when navigation changes.
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsMobileMoreOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!userData?.uid) return

    let cancelled = false
    migrateLegacyLocalDataToApi(userData.companyId)
      .then(({ found, migrated }) => {
        if (cancelled) return
        if (migrated > 0) {
          toast.success(`Recovered ${migrated} old record(s) from browser data`)
        } else if (found > 0) {
          // Legacy data was found but backend already had records for these modules.
          toast.message('Legacy data found; keeping existing backend records')
        }
      })
      .catch(() => {
        // Silent fail; app should remain usable even if migration cannot run.
      })

    return () => {
      cancelled = true
    }
  }, [userData?.uid, userData?.companyId])

  // Speed: prefetch route chunks + warm the most-used data after login during idle time.
  useEffect(() => {
    if (!userData?.uid) return
    let cancelled = false

    const initial = scheduleIdle(() => {
      if (cancelled) return

      // Prefetch common modules to make first navigation feel instant.
      ;['/sales', '/inventory', '/parties', '/expenses', '/quotations', '/banking', '/crm', '/visitors'].forEach(prefetchRoute)

      // Warm API caches so modules render without extra spinners.
      Promise.allSettled([
        getItems(),
        getParties('both'),
        getInvoices(),
        getExpenses(),
        getQuotations(),
        getLeads(),
        getVisitors(),
      ]).catch(() => {
        // ignore
      })
    }, 800)

    // Prefetch heavy reports chunk later (or on hover).
    const reportsTimer = window.setTimeout(() => {
      if (cancelled) return
      prefetchRoute('/reports')
    }, 6000)

    return () => {
      cancelled = true
      initial.cancel()
      window.clearTimeout(reportsTimer)
    }
  }, [userData?.uid])

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
    { path: '/parties', label: t.nav.parties, icon: Users, allowedRoles: ['admin', 'manager'], pageKey: 'parties' },
    { path: '/expenses', label: t.nav.expenses, icon: Bank, allowedRoles: ['admin', 'manager'], pageKey: 'expenses' },
  ]

  // Items inside "More" dropdown
  const moreMenuItems: Array<{
    path: string;
    label: string;
    icon: React.ElementType;
    pageKey?: keyof PagePermissions;
    allowedRoles?: string[];
  }> = []

  // Settings item (shown separately)
  const settingsItem = { path: '/settings', label: t.nav.settings, icon: Users, allowedRoles: ['admin'], pageKey: 'settings' as keyof PagePermissions }
  const visitorItem = { path: '/visitors', label: 'Visitors', icon: Users, allowedRoles: ['admin', 'manager'], pageKey: 'visitors' as keyof PagePermissions }

  const canAccessNavItem = (item: { pageKey?: keyof PagePermissions; allowedRoles?: string[] }) => {
    if (!item.pageKey && !item.allowedRoles) return true
    if (!userData?.uid || !userData?.role) return false
    if (userData.role === 'admin') return true
    if (item.pageKey) return canAccessPage(userData.uid, userData.role, item.pageKey)
    return !item.allowedRoles || item.allowedRoles.includes(userData.role)
  }

  const navigationItems = allNavigationItems.filter(canAccessNavItem)
  const filteredMoreMenuItems = moreMenuItems.filter(canAccessNavItem)
  const canAccessVisitors = userData?.uid && userData?.role && canAccessPage(userData.uid, userData.role, visitorItem.pageKey)
  const mobilePrimaryItems = navigationItems.slice(0, 3)
  const mobileOverflowItems = [...navigationItems.slice(3), ...filteredMoreMenuItems]
  const mobileRouteLabels = [
    { path: '/', label: t.nav.dashboard },
    ...navigationItems.map((item) => ({ path: item.path, label: item.label })),
    ...filteredMoreMenuItems.map((item) => ({ path: item.path, label: item.label })),
    ...(canAccessVisitors ? [{ path: visitorItem.path, label: visitorItem.label }] : []),
  ]
  const currentPageTitle =
    mobileRouteLabels.find((item) => location.pathname === item.path)?.label ||
    mobileRouteLabels.find((item) => location.pathname.startsWith(item.path + '/'))?.label ||
    (userData?.companyName || t.nav.dashboard)

  const isPathActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`)

  const activeModulePalette = getModulePalette(location.pathname)
  const moduleThemeVars = {
    ['--module-accent' as any]: activeModulePalette.accent,
    ['--module-accent-strong' as any]: activeModulePalette.accentStrong,
    ['--module-soft' as any]: activeModulePalette.soft,
    ['--module-page-bg' as any]: activeModulePalette.pageBg,
    ['--module-panel-bg' as any]: activeModulePalette.panelBg,
    ['--module-panel-border' as any]: activeModulePalette.border,
  } as React.CSSProperties

  const desktopRailItems: Array<{
    id: string;
    path: string;
    label: string;
    gradient: string;
    pageKey?: keyof PagePermissions;
    allowedRoles?: string[];
    end?: boolean;
    icon: React.ElementType;
  }> = [
    { id: 'dash', path: '/', label: 'DASH', gradient: 'from-blue-500 to-blue-700', end: true, icon: House },
    { id: 'admis', path: '/sales', label: 'ADMIS', gradient: 'from-violet-500 to-fuchsia-600', pageKey: 'sales', icon: Receipt },
    { id: 'student', path: '/parties', label: 'STUDENT', gradient: 'from-sky-500 to-cyan-600', pageKey: 'parties', allowedRoles: ['admin', 'manager'], icon: Users },
    { id: 'finance', path: '/expenses', label: 'FINANCE', gradient: 'from-orange-400 to-red-500', pageKey: 'expenses', allowedRoles: ['admin', 'manager'], icon: Bank },
    { id: 'setup', path: '/settings', label: 'VISITOR', gradient: 'from-slate-500 to-slate-700', pageKey: 'settings', allowedRoles: ['admin'], icon: Users },
  ]
  const filteredDesktopRailItems = desktopRailItems.filter(canAccessNavItem)
  const topNavGradientByPath = desktopRailItems.reduce((acc, item) => {
    acc[item.path] = item.gradient
    return acc
  }, {} as Record<string, string>)
  const getTopNavActiveClass = (path: string) => cn(
    "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-800 shadow-sm"
  )

  const companyInitials = (() => {
    const name = (userData?.companyName || userData?.displayName || 'T').trim()
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase())
      .join('')
    return initials || 'T'
  })()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200" style={moduleThemeVars}>
      {/* Desktop Navigation - Minimalist Style */}
      <header className="sticky top-0 z-50 hidden lg:block py-3 px-4 lg:px-6 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="w-full">
          <div className="flex items-center justify-between h-14 px-2">
            <div className="flex items-center gap-2 w-full">
              <nav className="flex items-center gap-2 w-full">
                {/* Dashboard (matches left HOME button) */}
                <NavLink
                  key="__dashboard"
                  to="/"
                  end
                  onMouseEnter={() => prefetchRoute('/')}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2 px-4 py-2 text-[17px] font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5",
                    isActive
                      ? getTopNavActiveClass('/')
                      : "bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-blue-400"
                  )}
                >
                  <House size={20} weight="bold" />
                  <span>{t.nav.dashboard}</span>
                </NavLink>

                {navigationItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onMouseEnter={() => prefetchRoute(item.path)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-4 py-2 text-[17px] font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5",
                      isActive
                        ? getTopNavActiveClass(item.path)
                        : "bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-blue-400"
                    )}
                  >
                    <item.icon size={20} weight="bold" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}

      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {navigationItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200",
                isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={24} weight={isActive ? "fill" : "regular"} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          {/* Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors duration-200"
          >
            <List size={24} />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

                {/* More Menu Items - shown directly in top nav */}
                {filteredMoreMenuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onMouseEnter={() => prefetchRoute(item.path)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-4 py-2 text-[17px] font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5",
                      isActive
                        ? getTopNavActiveClass(item.path)
                        : "bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-blue-400"
                    )}
                  >
                    <item.icon size={20} weight="bold" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}

                {/* Visitor (replaces Settings in nav) */}
                {canAccessVisitors && (
                  <NavLink
                    key="__visitors"
                    to={visitorItem.path}
                    onMouseEnter={() => prefetchRoute(visitorItem.path)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-2 px-4 py-2 text-[17px] font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5",
                      isActive
                        ? getTopNavActiveClass(visitorItem.path)
                        : "bg-white border border-slate-200 text-slate-600 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/50 dark:hover:text-blue-400"
                    )}
                  >
                    <visitorItem.icon size={20} weight="bold" />
                    <span>{visitorItem.label}</span>
                  </NavLink>
                )}

                {/* Notification Bell */}
                {!isMobileViewport && <NotificationBell className="ml-auto" />}

                {/* Company button (no Profile page): dropdown for theme + sign out */}
                <div className="relative" ref={userDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen((v) => !v)}
                    className={cn(
                      "flex items-center justify-center p-1.5 rounded-lg transition-all duration-200",
                      isUserDropdownOpen
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                    title={userData?.companyName || 'Company'}
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[12px] font-bold text-blue-700 dark:text-blue-300">
                      {companyInitials}
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



      {/* Mobile Header - Premium Glassmorphism */}
      <header className="sticky top-0 z-40 lg:hidden px-4 py-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="w-[84px]" aria-hidden="true" />
          
          <h1 className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white truncate max-w-[200px] text-center flex-1">
            {currentPageTitle}
          </h1>
          
          <div className="flex items-center justify-end w-[84px] gap-2">
            {isMobileViewport && (
            <NotificationBell
              buttonClassName="w-8 h-8 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700"
              panelClassName="right-0"
            />
            )}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200
                shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700
                active:scale-95
                transition-all duration-300"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={18} weight="bold" className="text-amber-500" /> : <Moon size={18} weight="bold" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-red-500 dark:text-red-400
                shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700
                active:scale-95
                transition-all duration-300"
              aria-label="Logout"
            >
              <SignOut size={18} weight="bold" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-3 py-2 pb-safe overflow-y-auto max-h-[calc(100svh-76px)] lg:px-6 lg:max-h-none lg:overflow-visible">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - Floating Dock */}
      <nav className="fixed bottom-4 left-4 right-4 lg:hidden z-40">
        <div className="flex justify-around items-center h-[72px] rounded-[2rem] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl
          shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]
          border border-white/50 dark:border-white/5 px-2">
          <NavLink
            to="/"
            className={({ isActive }) => cn(
              "relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-300",
              isActive
                ? "bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 -translate-y-1"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
            )}
            style={({ isActive }) => (isActive ? { color: getModulePalette('/').accentStrong } : undefined)}
          >
            {({ isActive }) => (
              <>
                <House size={24} weight={isActive ? "duotone" : "regular"} />
                <span className="text-[10px] font-bold tracking-wide">{t.nav.dashboard}</span>
                {isActive && (
                  <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-current" />
                )}
              </>
            )}
          </NavLink>

          {mobilePrimaryItems.map((item) => {
            const palette = getModulePalette(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onMouseEnter={() => prefetchRoute(item.path)}
                className={({ isActive }) => cn(
                  "relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-tr -translate-y-1"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
                )}
                style={({ isActive }) => (isActive ? { 
                  color: palette.accentStrong,
                  backgroundImage: `linear-gradient(to top right, ${palette.soft}, transparent)`
                } : undefined)}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={24} weight={isActive ? "duotone" : "regular"} />
                    <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
                    {isActive && (
                      <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-current" />
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
          {canAccessVisitors && (
            <NavLink
              to={visitorItem.path}
              onMouseEnter={() => prefetchRoute(visitorItem.path)}
              className={({ isActive }) => cn(
                "relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-300",
                isActive
                  ? "bg-gradient-to-tr -translate-y-1"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              )}
              style={({ isActive }) => (isActive ? { 
                color: getModulePalette(visitorItem.path).accentStrong,
                backgroundImage: `linear-gradient(to top right, ${getModulePalette(visitorItem.path).soft}, transparent)`
              } : undefined)}
            >
              {({ isActive }) => (
                <>
                  <visitorItem.icon size={24} weight={isActive ? "duotone" : "regular"} />
                  <span className="text-[10px] font-bold tracking-wide">{visitorItem.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-current" />
                  )}
                </>
              )}
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  )
}

export default Layout;
