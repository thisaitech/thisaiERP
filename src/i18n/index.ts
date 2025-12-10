// i18n - Internationalization Setup
import { en } from './translations/en'
import { ta } from './translations/ta'

export type Language = 'en' | 'ta'
export type TranslationType = typeof en

export const translations: Record<Language, TranslationType> = {
  en,
  ta,
}

export const languageNames: Record<Language, string> = {
  en: 'English',
  ta: 'தமிழ்',
}

export const languageFlags: Record<Language, string> = {
  en: '🇬🇧',
  ta: '🇮🇳',
}

// Get saved language from localStorage
export const getSavedLanguage = (): Language => {
  const saved = localStorage.getItem('thisai_crm_language')
  if (saved === 'en' || saved === 'ta') {
    return saved
  }
  return 'en' // default to English
}

// Save language to localStorage
export const saveLanguage = (lang: Language) => {
  localStorage.setItem('thisai_crm_language', lang)
}

export { en, ta }









