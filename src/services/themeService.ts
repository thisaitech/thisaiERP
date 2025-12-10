// Theme Service - Billi 2025
// Manages color themes and festival modes

export type ThemeMode = 'default' | 'diwali' | 'pongal' | 'christmas'

export interface FestivalInfo {
  id: ThemeMode
  name: string
  nameTamil: string
  icon: string
  startDate: string // MM-DD format
  endDate: string   // MM-DD format
  colors: {
    primary: string
    accent: string
    glow: string
  }
}

// Festival definitions
export const FESTIVALS: FestivalInfo[] = [
  {
    id: 'diwali',
    name: 'Diwali',
    nameTamil: 'தீபாவளி',
    icon: '🪔',
    startDate: '10-20',
    endDate: '11-15',
    colors: {
      primary: '#5A18C9',
      accent: '#FFD700',
      glow: 'rgba(255, 215, 0, 0.4)'
    }
  },
  {
    id: 'pongal',
    name: 'Pongal',
    nameTamil: 'பொங்கல்',
    icon: '🌾',
    startDate: '01-10',
    endDate: '01-20',
    colors: {
      primary: '#228B22',
      accent: '#FF6B00',
      glow: 'rgba(255, 107, 0, 0.3)'
    }
  },
  {
    id: 'christmas',
    name: 'Christmas',
    nameTamil: 'கிறிஸ்துமஸ்',
    icon: '🎄',
    startDate: '12-15',
    endDate: '12-31',
    colors: {
      primary: '#DC2626',
      accent: '#16A34A',
      glow: 'rgba(220, 38, 38, 0.3)'
    }
  }
]

// Get current theme from localStorage
export function getCurrentTheme(): ThemeMode {
  return (localStorage.getItem('billi_theme') as ThemeMode) || 'default'
}

// Set theme
export function setTheme(theme: ThemeMode): void {
  localStorage.setItem('billi_theme', theme)

  // Apply theme to document
  if (theme === 'default') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

// Check if any festival is active today
export function getActiveFestival(): FestivalInfo | null {
  const today = new Date()
  const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  for (const festival of FESTIVALS) {
    // Handle year-wrapping festivals (e.g., December to January)
    if (festival.startDate > festival.endDate) {
      // Festival spans year boundary
      if (monthDay >= festival.startDate || monthDay <= festival.endDate) {
        return festival
      }
    } else {
      // Normal festival range
      if (monthDay >= festival.startDate && monthDay <= festival.endDate) {
        return festival
      }
    }
  }

  return null
}

// Auto-apply festival theme if active
export function autoApplyFestivalTheme(): FestivalInfo | null {
  const storedTheme = getCurrentTheme()

  // Don't override if user manually set a theme
  const manuallySet = localStorage.getItem('billi_theme_manual') === 'true'
  if (manuallySet && storedTheme !== 'default') {
    setTheme(storedTheme)
    return FESTIVALS.find(f => f.id === storedTheme) || null
  }

  const activeFestival = getActiveFestival()
  if (activeFestival) {
    setTheme(activeFestival.id)
    return activeFestival
  }

  // Default theme
  setTheme('default')
  return null
}

// Manually set theme (marks as manual to prevent auto-override)
export function setManualTheme(theme: ThemeMode): void {
  setTheme(theme)
  localStorage.setItem('billi_theme_manual', theme !== 'default' ? 'true' : 'false')
}

// Get all available themes for theme picker
export function getAvailableThemes(): Array<{
  id: ThemeMode
  name: string
  nameTamil: string
  icon: string
  isActive: boolean
}> {
  const currentTheme = getCurrentTheme()

  const themes = [
    {
      id: 'default' as ThemeMode,
      name: 'Default',
      nameTamil: 'இயல்பு',
      icon: '🎨',
      isActive: currentTheme === 'default'
    },
    ...FESTIVALS.map(f => ({
      id: f.id,
      name: f.name,
      nameTamil: f.nameTamil,
      icon: f.icon,
      isActive: currentTheme === f.id
    }))
  ]

  return themes
}

// Initialize theme on app start
export function initializeTheme(): void {
  autoApplyFestivalTheme()
}
