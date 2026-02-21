import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  House, Receipt, Users, Package, ChartLine, List, X,
  Moon, Sun, Wallet, Bank, Gear, FileText, SignOut,
  Buildings, SquaresFour
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
import { toast } from 'sonner'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/Dashboard'),
  '/sales': () => import('../pages/Sales'),
  '/inventory': () => import('../pages/Inventory'),
  '/parties': () => import('../pages/Parties'),
  '/expenses': () => import('../pages/Expenses'),
  '/quotations': () => import('../pages/Quotations'),
  '/banking': () => import('../pages/Banking'),
  '/crm': () => import('../pages/CRM'),
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
  { path: '/sales', palette: { accent: '#a855f7', accentStrong: '#9333ea', soft: '#f3e8ff', pageBg: '#f2ebfb', panelBg: '#faf5ff', border: '#d8b4fe' } },
  { path: '/inventory', palette: { accent: '#f59e0b', accentStrong: '#ea580c', soft: '#ffedd5', pageBg: '#fdf1e6', panelBg: '#fff8f1', border: '#fdba74' } },
  { path: '/parties', palette: { accent: '#0ea5e9', accentStrong: '#0284c7', soft: '#e0f2fe', pageBg: '#e8f6fd', panelBg: '#f0f9ff', border: '#7dd3fc' } },
  { path: '/reports', palette: { accent: '#ec4899', accentStrong: '#db2777', soft: '#fce7f3', pageBg: '#fbebf4', panelBg: '#fdf2f8', border: '#f9a8d4' } },
  { path: '/expenses', palette: { accent: '#f97316', accentStrong: '#ea580c', soft: '#ffedd5', pageBg: '#fdf0e8', panelBg: '#fff7ed', border: '#fdba74' } },
  { path: '/quotations', palette: { accent: '#8b5cf6', accentStrong: '#7c3aed', soft: '#ede9fe', pageBg: '#eeeafd', panelBg: '#f5f3ff', border: '#c4b5fd' } },
  { path: '/crm', palette: { accent: '#10b981', accentStrong: '#059669', soft: '#dcfce7', pageBg: '#e9f8ef', panelBg: '#f0fdf4', border: '#86efac' } },
  { path: '/banking', palette: { accent: '#f43f5e', accentStrong: '#e11d48', soft: '#ffe4e6', pageBg: '#fcecee', panelBg: '#fff1f2', border: '#fda4af' } },
  { path: '/settings', palette: { accent: '#64748b', accentStrong: '#475569', soft: '#e2e8f0', pageBg: '#edf2f7', panelBg: '#f8fafc', border: '#cbd5e1' } },
  { path: '/company-info', palette: { accent: '#64748b', accentStrong: '#475569', soft: '#e2e8f0', pageBg: '#edf2f7', panelBg: '#f8fafc', border: '#cbd5e1' } },
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
      ;['/sales', '/inventory', '/parties', '/expenses', '/quotations', '/banking', '/crm'].forEach(prefetchRoute)

      // Warm API caches so modules render without extra spinners.
      Promise.allSettled([
        getItems(),
        getParties('both'),
        getInvoices(),
        getExpenses(),
        getQuotations(),
        getLeads(),
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

  const canAccessNavItem = (item: { pageKey?: keyof PagePermissions; allowedRoles?: string[] }) => {
    if (!item.pageKey && !item.allowedRoles) return true
    if (!userData?.uid || !userData?.role) return false
    if (userData.role === 'admin') return true
    if (item.pageKey) return canAccessPage(userData.uid, userData.role, item.pageKey)
    return !item.allowedRoles || item.allowedRoles.includes(userData.role)
  }

  const navigationItems = allNavigationItems.filter(canAccessNavItem)
  const filteredMoreMenuItems = moreMenuItems.filter(canAccessNavItem)
  const canAccessSettings = userData?.role === 'admin' || (userData?.uid && userData?.role && settingsItem.pageKey && canAccessPage(userData.uid, userData.role, settingsItem.pageKey))
  const mobilePrimaryItems = navigationItems.slice(0, 3)
  const mobileOverflowItems = [...navigationItems.slice(3), ...filteredMoreMenuItems]
  const mobileRouteLabels = [
    { path: '/', label: t.nav.dashboard },
    ...navigationItems.map((item) => ({ path: item.path, label: item.label })),
    ...filteredMoreMenuItems.map((item) => ({ path: item.path, label: item.label })),
    ...(canAccessSettings ? [{ path: settingsItem.path, label: settingsItem.label }] : []),
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
  }> = [
    { id: 'dash', path: '/', label: 'DASH', gradient: 'from-blue-500 to-blue-700', end: true },
    { id: 'admis', path: '/sales', label: 'ADMIS', gradient: 'from-violet-500 to-fuchsia-600', pageKey: 'sales' },
    { id: 'course', path: '/inventory', label: 'COURSE', gradient: 'from-amber-500 to-orange-600', pageKey: 'inventory', allowedRoles: ['admin', 'manager'] },
    { id: 'student', path: '/parties', label: 'STUDENT', gradient: 'from-sky-500 to-cyan-600', pageKey: 'parties', allowedRoles: ['admin', 'manager'] },
    { id: 'report', path: '/reports', label: 'REPORT', gradient: 'from-rose-500 to-pink-600', pageKey: 'reports', allowedRoles: ['admin', 'manager'] },
    { id: 'spend', path: '/expenses', label: 'SPEND', gradient: 'from-orange-400 to-red-500', pageKey: 'expenses', allowedRoles: ['admin', 'manager'] },
    { id: 'quote', path: '/quotations', label: 'QUOTE', gradient: 'from-indigo-500 to-violet-600', pageKey: 'quotations' },
    { id: 'crm', path: '/crm', label: 'CRM', gradient: 'from-emerald-500 to-green-600', pageKey: 'crm', allowedRoles: ['admin', 'manager', 'sales'] },
    { id: 'bank', path: '/banking', label: 'BANK', gradient: 'from-pink-500 to-rose-600', pageKey: 'banking', allowedRoles: ['admin', 'manager'] },
    { id: 'setup', path: '/settings', label: 'SETUP', gradient: 'from-slate-500 to-slate-700', pageKey: 'settings', allowedRoles: ['admin'] },
  ]
  const filteredDesktopRailItems = desktopRailItems.filter(canAccessNavItem)
  const topNavGradientByPath = desktopRailItems.reduce((acc, item) => {
    acc[item.path] = item.gradient
    return acc
  }, {} as Record<string, string>)
  const getTopNavActiveClass = (path: string) => cn(
    "bg-gradient-to-br text-white shadow-[2px_2px_4px_#c5ccd6,-2px_-2px_4px_#ffffff]",
    topNavGradientByPath[path] || "from-blue-500 to-blue-700"
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
    <div className="min-h-screen bg-[#e4ebf5] dark:bg-slate-900 text-slate-800 dark:text-slate-200" style={moduleThemeVars}>
      {/* Desktop Navigation - Neumorphic Style */}
      <header className="sticky top-0 z-50 hidden lg:block py-2 px-3 lg:pl-[112px] bg-[#e4ebf5] dark:bg-slate-900">
        <div className="w-full">
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
                  onMouseEnter={() => prefetchRoute('/')}
                  className={({ isActive }) => cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-[15px] font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? getTopNavActiveClass('/')
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
                    onMouseEnter={() => prefetchRoute(item.path)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-[15px] font-medium rounded-lg transition-all duration-200",
                      isActive
                        ? getTopNavActiveClass(item.path)
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
                    onMouseEnter={() => prefetchRoute(item.path)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-[15px] font-medium rounded-lg transition-all duration-200",
                      isActive
                        ? getTopNavActiveClass(item.path)
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
                    onMouseEnter={() => prefetchRoute(settingsItem.path)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-[15px] font-medium rounded-lg transition-all duration-200",
                      isActive
                        ? getTopNavActiveClass(settingsItem.path)
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
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-[11px] font-bold text-white shadow-sm">
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

      {/* Desktop Vertical Menu Bar (keeps top horizontal menu intact) */}
      <aside className="fixed left-0 top-0 bottom-0 z-[55] hidden lg:flex w-[102px] flex-col items-center py-2 bg-[#dfe7f2] dark:bg-slate-900/90 border-r border-white/50 dark:border-slate-700">
        <div className="flex-1 flex flex-col items-center gap-3 overflow-y-auto px-2 pt-1 pb-2">
          {filteredDesktopRailItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.end}
              onMouseEnter={() => prefetchRoute(item.path)}
              className={({ isActive }) => cn(
                "w-[78px] h-[78px] rounded-2xl bg-gradient-to-br text-white text-[14px] font-extrabold tracking-wide leading-none",
                "flex items-center justify-center text-center px-1 transition-all duration-200 shadow-[0_10px_20px_rgba(30,64,175,0.25)]",
                item.gradient,
                isActive
                  ? "ring-2 ring-white/90 scale-[1.02]"
                  : "opacity-95 hover:opacity-100 hover:-translate-y-0.5"
              )}
              title={item.label}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            if (canAccessSettings) navigate('/settings')
          }}
          className="mb-2 w-[66px] h-[66px] rounded-2xl bg-[#e4ebf5] dark:bg-slate-800 flex items-center justify-center
            shadow-[5px_5px_10px_#c5ccd6,-5px_-5px_10px_#ffffff] dark:shadow-[5px_5px_10px_#1e293b,-5px_-5px_10px_#334155]
            transition-transform duration-200 hover:-translate-y-0.5"
          title={userData?.companyName || 'Company'}
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-base font-bold text-white">
            {companyInitials}
          </div>
        </button>
      </aside>

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
          <h1 className="text-base font-bold text-slate-800 dark:text-white truncate max-w-[210px] text-center">
            {currentPageTitle}
          </h1>
          {location.pathname === '/' && canAccessSettings ? (
            <button
              onClick={() => navigate('/settings')}
              onMouseEnter={() => prefetchRoute('/settings')}
              className="p-2 rounded-lg bg-[#e4ebf5] dark:bg-slate-700
                shadow-[3px_3px_6px_#c5ccd6,-3px_-3px_6px_#ffffff]
                dark:shadow-[3px_3px_6px_#1e293b,-3px_-3px_6px_#334155]
                active:shadow-[inset_2px_2px_4px_#c5ccd6,inset_-2px_-2px_4px_#ffffff]
                transition-all duration-200"
              aria-label="Settings"
            >
              <Gear size={20} className="text-slate-600 dark:text-slate-300" />
            </button>
          ) : (
            <div className="w-10 h-10" aria-hidden="true" />
          )}
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
              onClick={closeMobileDrawers}
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
                {navigationItems.map((item) => {
                  const isActive = isPathActive(item.path)
                  const palette = getModulePalette(item.path)
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileDrawers}
                      onMouseEnter={() => prefetchRoute(item.path)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                        isActive
                          ? "shadow-[inset_4px_4px_8px_#c5ccd6,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#1e293b,inset_-4px_-4px_8px_#334155]"
                          : "text-slate-600 dark:text-slate-300 bg-[#e4ebf5] dark:bg-slate-800 border-[#d4ddea] dark:border-slate-700 shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155] active:shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]"
                      )}
                      style={
                        isActive
                          ? {
                              color: palette.accentStrong,
                              borderColor: palette.border,
                              background: `linear-gradient(135deg, ${palette.soft} 0%, #f7fbff 100%)`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
                        style={{
                          borderColor: isActive ? palette.border : '#d4ddea',
                          backgroundColor: isActive ? palette.soft : '#edf2fa',
                        }}
                      >
                        <item.icon size={16} weight="duotone" style={{ color: palette.accentStrong }} />
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}

                {/* More Menu Items */}
                {filteredMoreMenuItems.map((item) => {
                  const isActive = isPathActive(item.path)
                  const palette = getModulePalette(item.path)
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileDrawers}
                      onMouseEnter={() => prefetchRoute(item.path)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                        isActive
                          ? "shadow-[inset_4px_4px_8px_#c5ccd6,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#1e293b,inset_-4px_-4px_8px_#334155]"
                          : "text-slate-600 dark:text-slate-300 bg-[#e4ebf5] dark:bg-slate-800 border-[#d4ddea] dark:border-slate-700 shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155] active:shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]"
                      )}
                      style={
                        isActive
                          ? {
                              color: palette.accentStrong,
                              borderColor: palette.border,
                              background: `linear-gradient(135deg, ${palette.soft} 0%, #f7fbff 100%)`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
                        style={{
                          borderColor: isActive ? palette.border : '#d4ddea',
                          backgroundColor: isActive ? palette.soft : '#edf2fa',
                        }}
                      >
                        <item.icon size={16} weight="duotone" style={{ color: palette.accentStrong }} />
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}

                {/* Settings */}
                {canAccessSettings && (
                  (() => {
                    const isActive = isPathActive(settingsItem.path)
                    const palette = getModulePalette(settingsItem.path)
                    return (
                      <NavLink
                        to={settingsItem.path}
                        onClick={closeMobileDrawers}
                        onMouseEnter={() => prefetchRoute(settingsItem.path)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                          isActive
                            ? "shadow-[inset_4px_4px_8px_#c5ccd6,inset_-4px_-4px_8px_#ffffff] dark:shadow-[inset_4px_4px_8px_#1e293b,inset_-4px_-4px_8px_#334155]"
                            : "text-slate-600 dark:text-slate-300 bg-[#e4ebf5] dark:bg-slate-800 border-[#d4ddea] dark:border-slate-700 shadow-[4px_4px_8px_#c5ccd6,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155] active:shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff]"
                        )}
                        style={
                          isActive
                            ? {
                                color: palette.accentStrong,
                                borderColor: palette.border,
                                background: `linear-gradient(135deg, ${palette.soft} 0%, #f7fbff 100%)`,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
                          style={{
                            borderColor: isActive ? palette.border : '#d4ddea',
                            backgroundColor: isActive ? palette.soft : '#edf2fa',
                          }}
                        >
                          <settingsItem.icon size={16} weight="duotone" style={{ color: palette.accentStrong }} />
                        </span>
                        <span>{settingsItem.label}</span>
                      </NavLink>
                    )
                  })()
                )}
              </nav>

              {/* Bottom Actions */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-900 bg-black shadow-none">
                  <span className="text-sm text-white">Dark Mode</span>
                  <button
                    onClick={toggleDarkMode}
                    className="p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white shadow-none
                      active:brightness-110
                      transition-all duration-200"
                  >
                    {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-white" />}
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

      {/* Mobile More Sheet */}
      <AnimatePresence>
        {isMobileMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[55] lg:hidden"
              onClick={() => setIsMobileMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="fixed left-0 right-0 bottom-0 z-[56] lg:hidden rounded-t-2xl bg-[#e4ebf5] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">More Modules</h3>
                <button
                  type="button"
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => setIsMobileMoreOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-3 py-3 max-h-[65vh] overflow-auto space-y-2">
                {mobileOverflowItems.map((item) => {
                  const isActive = isPathActive(item.path)
                  const palette = getModulePalette(item.path)
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileDrawers}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors border',
                        isActive
                          ? 'text-white'
                          : 'text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-700/80 border-slate-200 dark:border-slate-600'
                      )}
                      style={
                        isActive
                          ? {
                              borderColor: palette.border,
                              background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentStrong} 100%)`,
                            }
                          : undefined
                      }
                    >
                      <item.icon size={18} weight="bold" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
                {canAccessSettings && (
                  (() => {
                    const isActive = isPathActive(settingsItem.path)
                    const palette = getModulePalette(settingsItem.path)
                    return (
                      <NavLink
                        to={settingsItem.path}
                        onClick={closeMobileDrawers}
                        className={cn(
                          'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors border',
                          isActive
                            ? 'text-white'
                            : 'text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-700/80 border-slate-200 dark:border-slate-600'
                        )}
                        style={
                          isActive
                            ? {
                                borderColor: palette.border,
                                background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentStrong} 100%)`,
                              }
                            : undefined
                        }
                      >
                        <settingsItem.icon size={18} weight="bold" />
                        <span>{settingsItem.label}</span>
                      </NavLink>
                    )
                  })()
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="w-full px-3 py-2 pb-safe overflow-y-auto max-h-[calc(100svh-76px)] lg:pl-[112px] lg:max-h-none lg:overflow-visible">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - Neumorphic */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden z-40 p-3 bg-[#e4ebf5] dark:bg-slate-900">
        <div className="flex justify-around items-center h-16 rounded-2xl bg-[#e4ebf5] dark:bg-slate-800
          shadow-[6px_6px_12px_#c5ccd6,-6px_-6px_12px_#ffffff]
          dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]">
          <NavLink
            to="/"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-200",
              isActive
                ? "shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155]"
                : "text-slate-500 dark:text-slate-400"
            )}
            style={({ isActive }) => (isActive ? { color: getModulePalette('/').accentStrong } : undefined)}
          >
            <House size={22} weight="regular" />
            <span className="text-[10px] font-semibold">{t.nav.dashboard}</span>
          </NavLink>

          {mobilePrimaryItems.map((item) => {
            const palette = getModulePalette(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onMouseEnter={() => prefetchRoute(item.path)}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "shadow-[inset_3px_3px_6px_#c5ccd6,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#1e293b,inset_-3px_-3px_6px_#334155]"
                    : "text-slate-500 dark:text-slate-400"
                )}
                style={({ isActive }) => (isActive ? { color: palette.accentStrong } : undefined)}
              >
                <item.icon size={22} weight={"regular"} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </NavLink>
            )
          })}
          <button
            type="button"
            onClick={() => setIsMobileMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-200",
              isMobileMoreOpen ? "" : "text-slate-500 dark:text-slate-400"
            )}
            style={isMobileMoreOpen ? { color: activeModulePalette.accentStrong } : undefined}
          >
            <SquaresFour size={22} weight="regular" />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default Layout;
