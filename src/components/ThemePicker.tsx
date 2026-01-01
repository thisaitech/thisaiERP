// ThemePicker.tsx - Festival theme selector for Anna 2025
// Allows users to switch between default and festival themes

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Check } from '@phosphor-icons/react'
import { cn } from '../lib/utils'
import {
  getAvailableThemes,
  setManualTheme,
  getCurrentTheme,
  getActiveFestival,
  type ThemeMode
} from '../services/themeService'

interface ThemePickerProps {
  className?: string
  compact?: boolean
}

const ThemePicker: React.FC<ThemePickerProps> = ({ className, compact = true }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('default')
  const themes = getAvailableThemes()
  const activeFestival = getActiveFestival()

  useEffect(() => {
    setCurrentTheme(getCurrentTheme())
  }, [])

  const handleThemeChange = (themeId: ThemeMode) => {
    setManualTheme(themeId)
    setCurrentTheme(themeId)
    setIsOpen(false)
  }

  const currentThemeInfo = themes.find(t => t.id === currentTheme)

  if (compact) {
    return (
      <div className={cn('relative', className)}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
            "hover:bg-muted border border-border/50",
            currentTheme !== 'default' && "bg-brand-gradient-soft border-primary/20"
          )}
        >
          <span className="text-lg">{currentThemeInfo?.icon || '🎨'}</span>
          <span className="text-sm font-medium">{currentThemeInfo?.name || 'Theme'}</span>
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />

              {/* Dropdown */}
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
              >
                <div className="p-2">
                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Select Theme
                  </p>

                  {themes.map((theme) => (
                    <motion.button
                      key={theme.id}
                      whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleThemeChange(theme.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        theme.isActive && "bg-brand-gradient-soft"
                      )}
                    >
                      <span className="text-xl">{theme.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium">{theme.name}</p>
                        <p className="text-xs text-muted-foreground">{theme.nameTamil}</p>
                      </div>
                      {theme.isActive && (
                        <Check size={18} weight="bold" className="text-primary" />
                      )}
                    </motion.button>
                  ))}

                  {/* Active festival hint */}
                  {activeFestival && currentTheme !== activeFestival.id && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-700">
                        {activeFestival.icon} {activeFestival.name} is active! Tap to enable festival theme.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full theme picker grid
  return (
    <div className={cn('bg-card rounded-xl border border-border p-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Palette size={20} weight="duotone" className="text-primary" />
        <h3 className="font-semibold">App Theme</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {themes.map((theme) => (
          <motion.button
            key={theme.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleThemeChange(theme.id)}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
              theme.isActive
                ? "border-primary bg-brand-gradient-soft"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="text-3xl">{theme.icon}</span>
            <div className="text-center">
              <p className="text-sm font-medium">{theme.name}</p>
              <p className="text-xs text-muted-foreground">{theme.nameTamil}</p>
            </div>
            {theme.isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
              >
                <Check size={12} weight="bold" className="text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Festival hint */}
      {activeFestival && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-brand-gradient-soft rounded-lg border border-primary/20"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeFestival.icon}</span>
            <div>
              <p className="text-sm font-medium">
                {activeFestival.name} is here! ({activeFestival.nameTamil})
              </p>
              <p className="text-xs text-muted-foreground">
                Celebrate with a special theme
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default ThemePicker
