import React, { createContext, useContext, useEffect, useState } from 'react'
import { getGeneralSettings } from '../services/settingsService'

interface ThemeContextType {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (value: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Load dark mode setting on mount
  useEffect(() => {
    const settings = getGeneralSettings()
    setIsDarkMode(settings.darkMode || false)
  }, [])

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Listen for settings changes from localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appSettings') {
        try {
          const stored = e.newValue
          if (stored) {
            const settings = JSON.parse(stored)
            setIsDarkMode(settings.general?.darkMode || false)
          }
        } catch (error) {
          console.error('Error parsing settings:', error)
        }
      }
    }

    // Custom event for same-window updates
    const handleSettingsUpdate = () => {
      const settings = getGeneralSettings()
      setIsDarkMode(settings.darkMode || false)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('settingsUpdated', handleSettingsUpdate)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('settingsUpdated', handleSettingsUpdate)
    }
  }, [])

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

  const setDarkMode = (value: boolean) => {
    setIsDarkMode(value)
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
