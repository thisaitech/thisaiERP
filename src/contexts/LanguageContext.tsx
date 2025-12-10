// Language Context - For managing app-wide language settings
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Language, 
  TranslationType, 
  translations, 
  getSavedLanguage, 
  saveLanguage,
  languageNames,
  languageFlags 
} from '../i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslationType
  languageName: string
  languageFlag: string
  availableLanguages: { code: Language; name: string; flag: string }[]
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(getSavedLanguage())

  // Update language and save to localStorage
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    saveLanguage(lang)
    // Update HTML lang attribute for accessibility
    document.documentElement.lang = lang
  }, [])

  // Set initial HTML lang attribute
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  // Memoize derived values to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    // Get current translations
    const t = translations[language]

    // Get language name and flag
    const languageName = languageNames[language]
    const languageFlag = languageFlags[language]

    // List of available languages
    const availableLanguages = [
      { code: 'en' as Language, name: languageNames.en, flag: languageFlags.en },
      { code: 'ta' as Language, name: languageNames.ta, flag: languageFlags.ta },
    ]

    return {
      language,
      setLanguage,
      t,
      languageName,
      languageFlag,
      availableLanguages,
    }
  }, [language, setLanguage])

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

// Hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Shorthand hook for just translations
export const useTranslation = () => {
  const { t, language } = useLanguage()
  return { t, language }
}

export default LanguageContext









